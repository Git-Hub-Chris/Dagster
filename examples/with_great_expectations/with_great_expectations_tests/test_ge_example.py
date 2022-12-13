import pytest
from with_great_expectations import defs
from with_great_expectations.ge_demo import payroll_data

from dagster._utils import file_relative_path


def test_pipeline_success():
    res = payroll_data.execute_in_process()
    assert res.success


def test_pipeline_failure():
    with pytest.raises(ValueError):
        payroll_data.execute_in_process(
            run_config={
                "resources": {
                    "ge_data_context": {
                        "config": {
                            "ge_root_dir": file_relative_path(
                                __file__, "../with_great_expectations/great_expectations"
                            )
                        }
                    }
                },
                "ops": {
                    "read_in_datafile": {
                        "inputs": {
                            "csv_path": {
                                "value": file_relative_path(
                                    __file__, "../with_great_expectations/data/fail.csv"
                                )
                            }
                        }
                    }
                },
            }
        )


def test_defs_can_load():
    assert defs.get_job_def("payroll_data")
