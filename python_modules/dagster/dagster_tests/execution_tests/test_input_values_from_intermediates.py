from dagster import List, Optional
from dagster._core.definitions.decorators import op
from dagster._core.definitions.input import In
from dagster._legacy import execute_pipeline, pipeline


def test_from_intermediates_from_multiple_outputs():
    @op
    def x():
        return "x"

    @op
    def y():
        return "y"

    @op(ins={"stuff": In(Optional[List[str]])})
    def gather(stuff):
        return "{} and {}".format(*stuff)

    @pipeline
    def pipe():
        gather([x(), y()])

    result = execute_pipeline(pipe)

    assert result
    assert result.success
    assert (
        result.result_for_node("gather")
        .compute_input_event_dict["stuff"]
        .event_specific_data[1]
        .label
        == "stuff"
    )
    assert result.result_for_node("gather").output_value() == "x and y"


def test_from_intermediates_from_config():
    run_config = {"solids": {"x": {"inputs": {"string_input": {"value": "Dagster is great!"}}}}}

    @op
    def x(string_input):
        return string_input

    @pipeline
    def pipe():
        x()

    result = execute_pipeline(pipe, run_config=run_config)

    assert result
    assert result.success
    assert (
        result.result_for_node("x")
        .compute_input_event_dict["string_input"]
        .event_specific_data[1]
        .label
        == "string_input"
    )
    assert result.result_for_node("x").output_value() == "Dagster is great!"
