---
title: "Constructing schedules from partitioned assets and jobs"
description: "Learn to construct schedules for your partitioned jobs."
sidebar_position: 400
---

In this guide, we'll walk you through how to construct schedules from partitioned [assets](/guides/build/assets/) and jobs. By the end, you'll be able to:

- Construct a schedule for a time-partitioned job
- Customize a partitioned job's starting time
- Customize the most recent partition in a set
- Construct a schedule for a statically-partitioned job

:::note

This article assumes familiarity with:

- [Schedules](index.md)
- [Partitions](/guides/build/partitions-and-backfills/partitioning-assets)
- [Asset definitions](/guides/build/assets/defining-assets)
- [Asset jobs](/guides/build/assets/asset-jobs) and [op jobs](/todo)

:::

## Working with time-based partitions

For jobs partitioned by time, you can use the <PyObject section="schedules-sensors" module="dagster" object="build_schedule_from_partitioned_job"/> to construct a schedule for the job. The schedule's interval will match the spacing of the partitions in the job. For example, if you have a daily partitioned job that fills in a date partition of a table each time it runs, you likely want to run that job every day.

Refer to the following tabs for examples of asset and op-based jobs using <PyObject section="schedules-sensors" module="dagster" object="build_schedule_from_partitioned_job"/> to construct schedules:

<Tabs>
<TabItem value="Asset jobs">

**Asset jobs**

Asset jobs are defined using <PyObject section="assets" module="dagster" object="define_asset_job" />. In this example, we created an asset job named `partitioned_job` and then constructed `asset_partitioned_schedule` by using <PyObject section="schedules-sensors" module="dagster" object="build_schedule_from_partitioned_job"/>:

{/* TODO convert to <CodeExample> */}
```python file=/concepts/partitions_schedules_sensors/schedule_from_partitions.py startafter=start_partitioned_asset_schedule endbefore=end_partitioned_asset_schedule
from dagster import (
    asset,
    build_schedule_from_partitioned_job,
    define_asset_job,
    DailyPartitionsDefinition,
)

daily_partition = DailyPartitionsDefinition(start_date="2024-05-20")


@asset(partitions_def=daily_partition)
def daily_asset(): ...


partitioned_asset_job = define_asset_job("partitioned_job", selection=[daily_asset])


asset_partitioned_schedule = build_schedule_from_partitioned_job(
    partitioned_asset_job,
)
```

</TabItem>
<TabItem value="Op jobs">

**Op jobs**

Op jobs are defined using the <PyObject section="jobs" module="dagster" object="job" decorator />. In this example, we created a partitioned job named `partitioned_op_job` and then constructed `partitioned_op_schedule` using <PyObject section="schedules-sensors" module="dagster" object="build_schedule_from_partitioned_job"/>:

{/* TODO convert to <CodeExample> */}
```python file=/concepts/partitions_schedules_sensors/schedule_from_partitions.py startafter=start_marker endbefore=end_marker
from dagster import build_schedule_from_partitioned_job, job


@job(config=partitioned_config)
def partitioned_op_job(): ...


partitioned_op_schedule = build_schedule_from_partitioned_job(
    partitioned_op_job,
)
```

</TabItem>
</Tabs>

### Customizing schedule timing

The `minute_of_hour`, `hour_of_day`, `day_of_week`, and `day_of_month` parameters of `build_schedule_from_partitioned_job` can be used to control the timing of the schedule.

Consider the following job:

{/* TODO convert to <CodeExample> */}
```python file=/concepts/partitions_schedules_sensors/schedule_from_partitions.py startafter=start_partitioned_schedule_with_offset endbefore=end_partitioned_schedule_with_offset
from dagster import build_schedule_from_partitioned_job

asset_partitioned_schedule = build_schedule_from_partitioned_job(
    partitioned_asset_job, hour_of_day=1, minute_of_hour=30
)
```

On May 20, 2024, the schedule will evaluate at 1:30 AM UTC and then start a run for the partition key of the previous day, `2024-05-19`.

### Customizing the ending partition in a set

:::tip

The examples in this section use daily partitions, but the same logic also applies to other time-based partitions, such as hourly, weekly, and monthly partitions.

:::

Each schedule tick of a partitioned job targets the latest partition in the partition set that exists as of the tick time. For example, consider a schedule that runs a daily-partitioned job. When the schedule runs on `2024-05-20`, it will target the most recent partition, which will correspond to the previous day: `2024-05-19`.

| If a job runs on this date... | It will target this partition |
| ----------------------------- | ----------------------------- |
| 2024-05-20                    | 2024-05-19                    |
| 2024-05-21                    | 2024-05-20                    |
| 2024-05-22                    | 2024-05-21                    |

This occurs because each partition is a **time window**. A time window is a set period of time with a start and an end time. The partition's key is the start of the time window, but the partition isn't included in the partition set until its time window has completed. Kicking off a run after the time window completes allows the run to process data for the entire time window.

Continuing with the daily partition example, the `2024-05-20` partition would have the following start and end times:

- **Start time** - `2024-05-20 00:00:00`
- **End time** - `2024-05-20 23:59:59`

After `2024-05-20 23:59:59` passes, the time window is complete and Dagster will add a new `2024-05-20` partition to the partition set. At this point, the process will repeat with the next time window of `2024-05-21`.

If you need to customize the ending, or most recent partition in a set, use the `end_offset` parameter in the partition's config:

{/* TODO convert to <CodeExample> */}
```python file=/concepts/partitions_schedules_sensors/schedule_from_partitions.py startafter=start_offset_partition endbefore=end_offset_partition
from dagster import DailyPartitionsDefinition

daily_partition_with_offset = DailyPartitionsDefinition(
    start_date="2024-05-20", end_offset=-1
)
```

Setting this parameter changes the partition that will be filled in at each schedule tick. Positive and negative integers are accepted, which will have the following effects:

- **Positive numbers**, like `1`, cause the schedule to fill in the partition of the **current** hour/day/week/month
- **Negative numbers**, like `-1,` cause the schedule to fill in the partition of an **earlier** hour/day/week/month

Generally, the calculation for `end_offset` can be expressed as:

```shell
current_date - 1 type_of_partition + end_offset
```

Let's look at an example schedule that's partitioned by day and how different `end_offset` values would affect the most recent partition in the set. In this example, we're using a start date of `2024-05-20`:

| End offset   | Calculated as                 | Ending (most recent) partition          |
| ------------ | ----------------------------- | --------------------------------------- |
| Offset of -1 | `2024-05-20 - 1 day + -1 day` | 2024-05-18 (2 days prior to start date) |
| No offset    | `2024-05-20 - 1 day + 0 days` | 2024-05-19 (1 day prior to start date)  |
| Offset of 1  | `2024-05-20 - 1 day + 1 day`  | 2024-05-20 (start date)                 |

## Working with static partitions

Next, we'll demonstrate how to create a schedule for a job with a static partition. To do this, we'll construct the schedule from scratch using the <PyObject section="schedules-sensors" module="dagster" object="schedule" decorator /> decorator, rather than using a helper function like <PyObject section="schedules-sensors" module="dagster" object="build_schedule_from_partitioned_job"/>. This will allow more flexibility in determining which partitions should be run by the schedule.

In this example, the job is partitioned by continent:

{/* TODO convert to <CodeExample> */}
```python file=/concepts/partitions_schedules_sensors/static_partitioned_asset_job.py startafter=start_job endbefore=end_job
from dagster import (
    AssetExecutionContext,
    Config,
    asset,
    define_asset_job,
    static_partitioned_config,
)

CONTINENTS = [
    "Africa",
    "Antarctica",
    "Asia",
    "Europe",
    "North America",
    "Oceania",
    "South America",
]


@static_partitioned_config(partition_keys=CONTINENTS)
def continent_config(partition_key: str):
    return {"ops": {"continents": {"config": {"continent_name": partition_key}}}}


class ContinentOpConfig(Config):
    continent_name: str


@asset
def continents(context: AssetExecutionContext, config: ContinentOpConfig):
    context.log.info(config.continent_name)


continent_job = define_asset_job(
    name="continent_job", selection=[continents], config=continent_config
)
```

Using the <PyObject section="schedules-sensors" module="dagster" object="schedule" decorator /> decorator, we'll write a schedule that targets each partition, or `continent`:

{/* TODO convert to <CodeExample> */}
```python file=/concepts/partitions_schedules_sensors/static_partitioned_asset_job.py startafter=start_schedule_all_partitions endbefore=end_schedule_all_partitions
from dagster import RunRequest, schedule


@schedule(cron_schedule="0 0 * * *", job=continent_job)
def continent_schedule():
    for c in CONTINENTS:
        yield RunRequest(run_key=c, partition_key=c)
```

If we only want to target the `Antarctica` partition, we can create a schedule like the following:

{/* TODO convert to <CodeExample> */}
```python file=/concepts/partitions_schedules_sensors/static_partitioned_asset_job.py startafter=start_single_partition endbefore=end_single_partition
from dagster import RunRequest, schedule


@schedule(cron_schedule="0 0 * * *", job=continent_job)
def antarctica_schedule():
    return RunRequest(partition_key="Antarctica")
```

## APIs in this guide

| Name                                                      | Description                                                                                         |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| <PyObject section="schedules-sensors" module="dagster" object="schedule" decorator />                  | Decorator that defines a schedule that executes according to a given cron schedule.                 |
| <PyObject section="schedules-sensors" module="dagster" object="build_schedule_from_partitioned_job" /> | A function that constructs a schedule whose interval matches the partitioning of a partitioned job. |
| <PyObject section="schedules-sensors" module="dagster" object="RunRequest" />                          | A class that represents all the information required to launch a single run.                        |
| <PyObject section="assets" module="dagster" object="define_asset_job" />                    | A function for defining a job from a selection of assets.                                           |
| <PyObject section="jobs" module="dagster" object="job" decorator />                       | The decorator used to define a job.                                                                 |
