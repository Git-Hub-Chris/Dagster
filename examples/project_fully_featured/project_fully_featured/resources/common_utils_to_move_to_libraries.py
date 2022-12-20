from dagster_aws.s3.utils import construct_s3_client
from typing import Optional
from dagster import io_manager


def build_s3_session(
    *,
    max_attempts: int = 5,
    use_unsigned_session: bool = False,
    region_name: Optional[str] = None,
    endpoint_url: Optional[str] = None,
    profile_name: Optional[str] = None,
):
    return construct_s3_client(
        max_attempts=max_attempts,
        use_unsigned_session=use_unsigned_session,
        region_name=region_name,
        endpoint_url=endpoint_url,
        profile_name=profile_name,
    )


def deferred_io_manager(func):
    @io_manager
    def _a_io_manager(_):
        return func()

    return _a_io_manager
