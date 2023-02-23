import os
from collections import Counter

from dagster import In, file_relative_path, repository
from dagster._core.definitions.decorators import op
from dagster._legacy import (
    ModeDefinition,
    PresetDefinition,
    default_executors,
    pipeline,
)
from dagster_aws.s3 import s3_pickle_io_manager, s3_resource
from dagster_celery_k8s import celery_k8s_job_executor


@op(ins={"word": In()}, config_schema={"factor": int})
def multiply_the_word(context, word):
    return word * context.op_config["factor"]


@op(ins={"word": In()})
def count_letters(_context, word):
    return dict(Counter(word))


@pipeline(
    mode_defs=[
        ModeDefinition(
            name="default",
            resource_defs={"s3": s3_resource, "io_manager": s3_pickle_io_manager},
            executor_defs=[*default_executors, celery_k8s_job_executor],
        ),
        ModeDefinition(
            name="test",
            executor_defs=[*default_executors, celery_k8s_job_executor],
        ),
    ],
    preset_defs=[
        PresetDefinition.from_files(
            "celery_k8s",
            config_files=[
                file_relative_path(__file__, os.path.join("..", "run_config", "celery_k8s.yaml")),
                file_relative_path(__file__, os.path.join("..", "run_config", "pipeline.yaml")),
            ],
            mode="default",
        ),
        PresetDefinition.from_files(
            "default",
            config_files=[
                file_relative_path(__file__, os.path.join("..", "run_config", "pipeline.yaml")),
            ],
            mode="default",
        ),
    ],
)
def example_pipe():
    count_letters(multiply_the_word())


@repository
def example_repo():
    return [example_pipe]
