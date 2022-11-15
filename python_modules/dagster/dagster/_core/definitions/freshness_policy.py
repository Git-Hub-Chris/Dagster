import datetime
from typing import AbstractSet, Mapping, NamedTuple, Optional

import pendulum
from croniter import croniter

import dagster._check as check
from dagster._annotations import experimental
from dagster._serdes import whitelist_for_serdes

from .events import AssetKey


class FreshnessConstraint(NamedTuple):
    asset_key: AssetKey
    required_data_time: datetime.datetime
    required_by_time: datetime.datetime


@experimental
@whitelist_for_serdes
class FreshnessPolicy(
    NamedTuple(
        "_FreshnessPolicy",
        [
            ("maximum_lag_minutes", float),
            ("cron_schedule", Optional[str]),
        ],
    )
):
    """
    A FreshnessPolicy specifies how up-to-date you want a given asset to be, relative to the
    most recent available upstream data. At any point in time (or by each cron schedule tick, if
    cron_schedule is set), the data used to produce the current version of this asset must be no
    older than `maximum_lag_minutes` before the most recent available data.

    Examples:

        * `FreshnessPolicy(maximum_lag_minutes=30)`: At any point in time, this asset must
        incorporate all data from at least 30 minutes ago.
        * `FreshnessPolicy(maximum_lag_minutes=60, cron_schedule="0 1 * * *"): Every day by 1AM,
        this asset must incorporate all data from at least 60 minutes ago.
    """

    def __new__(cls, *, maximum_lag_minutes: float, cron_schedule: Optional[str] = None):
        return super(FreshnessPolicy, cls).__new__(
            cls,
            maximum_lag_minutes=float(
                check.numeric_param(maximum_lag_minutes, "maximum_lag_minutes")
            ),
            cron_schedule=check.opt_str_param(cron_schedule, "cron_schedule"),
        )

    @property
    def maximum_lag_delta(self) -> datetime.timedelta:
        return datetime.timedelta(minutes=self.maximum_lag_minutes)

    def constraints_for_time_window(
        self,
        window_start: datetime.datetime,
        window_end: datetime.datetime,
        used_data_times: Mapping[AssetKey, Optional[datetime.datetime]],
        available_data_times: Mapping[AssetKey, Optional[datetime.datetime]],
    ) -> AbstractSet[FreshnessConstraint]:
        """For a given time window, calculate a set of FreshnessConstraints that this asset must
        satisfy.

        Args:
            window_start (datetime): The start time of the window that constraints will be
                calculated for. Generally, this is the current time.
            window_start (datetime): The end time of the window that constraints will be
                calculated for.
            used_data_times (Mapping[AssetKey, Optional[datetime]]): For each of the relevant
                upstream assets, the timestamp of the data that was used to create the current
                version of this asset.
            available_data_times (Mapping[AssetKey, Optional[datetime]]): For each of the relevant
                upstream assets, the timestamp of the most recent available data. Currently, this
                is always equal to the current time, reflecting that if an asset is executed, it
                will incorporate all data in the external world up until that point in time.
        """
        constraints = set()

        # get an iterator of times to evaluate these constraints at
        if self.cron_schedule:
            constraint_ticks = croniter(
                self.cron_schedule, window_start, ret_type=datetime.datetime
            )
        else:
            # this constraint must be satisfied at all points in time, so generate a series of
            # many constraints (10 per maximum lag window)
            period = pendulum.period(pendulum.instance(window_start), pendulum.instance(window_end))
            # old versions of pendulum return a list, so ensure this is an iterator
            constraint_ticks = iter(
                period.range("minutes", (self.maximum_lag_minutes / 10.0) + 0.1)
            )

        # iterate over each schedule tick in the provided time window
        evaluation_tick = next(constraint_ticks, None)
        while evaluation_tick is not None and evaluation_tick < window_end:
            for asset_key, available_data_time in available_data_times.items():
                if available_data_time is None:
                    continue
                # assume updated data is always available
                elif available_data_time == window_start:
                    required_data_time = evaluation_tick - self.maximum_lag_delta
                    required_by_time = evaluation_tick
                # assume updated data not always available, just require the latest
                # available data
                else:
                    required_data_time = available_data_time
                    required_by_time = available_data_time + self.maximum_lag_delta

                # only add constraints if they are not currently satisfied
                used_data_time = used_data_times.get(asset_key)
                if used_data_time is None or used_data_time < required_data_time:
                    constraints.add(
                        FreshnessConstraint(
                            asset_key=asset_key,
                            required_data_time=required_data_time,
                            required_by_time=required_by_time,
                        )
                    )

            evaluation_tick = next(constraint_ticks, None)
            # fallback if the user selects a very small maximum_lag_minutes value
            if len(constraints) > 100:
                break
        return constraints

    def minutes_late(
        self,
        evaluation_time: Optional[datetime.datetime],
        used_data_times: Mapping[AssetKey, Optional[datetime.datetime]],
        available_data_times: Mapping[AssetKey, Optional[datetime.datetime]],
    ) -> Optional[float]:
        """Returns a number of minutes past the specified freshness policy that this asset currently
        is. If the asset is missing upstream data, or is not materialized at all, then it is unknown
        how late it is, and this will return None.

        Args:
            evaluation_time (datetime): The time at which we're evaluating the lateness of this
                asset. Generally, this is the current time.
            used_data_times (Mapping[AssetKey, Optional[datetime]]): For each of the relevant
                upstream assets, the timestamp of the data that was used to create the current
                version of this asset.
            available_data_times (Mapping[AssetKey, Optional[datetime]]): For each of the relevant
                upstream assets, the timestamp of the most recent available data. Currently, this
                is always equal to the current time, reflecting that if an asset is executed, it
                will incorporate all data in the external world up until that point in time.
        """
        if self.cron_schedule:
            # most recent cron schedule tick
            schedule_ticks = croniter(
                self.cron_schedule, evaluation_time, ret_type=datetime.datetime, is_prev=True
            )
            evaluation_tick = next(schedule_ticks)
        else:
            evaluation_tick = evaluation_time

        minutes_late = 0.0
        for asset_key, available_data_time in available_data_times.items():
            # upstream data is not available, undefined how out of date you are
            if available_data_time is None:
                return None

            # upstream data was not used, undefined how out of date you are
            used_data_time = used_data_times[asset_key]
            if used_data_time is None:
                return None

            # in the case that we're basing available data time off of upstream materialization
            # events instead of the current time, you are considered up to date if it's no more
            # than maximum_lag_duration after your upstream asset updated
            if (
                evaluation_time != available_data_time
                and evaluation_tick < available_data_time + self.maximum_lag_delta
            ):
                continue

            # require either the most recent available data time, or data from maximum_lag_duration
            # before the most recent evaluation tick, whichever is less strict
            required_time = min(available_data_time, evaluation_tick - self.maximum_lag_delta)

            if used_data_time < required_time:
                minutes_late = max(
                    minutes_late, (required_time - used_data_time).total_seconds() / 60
                )
        return minutes_late
