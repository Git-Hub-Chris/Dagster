import pytest

from dagster import AssetKey, IOManager, Out, Output, io_manager
from dagster._check import CheckError
from dagster.core.asset_defs import AssetGroup, AssetIn, SourceAsset, asset, multi_asset
from dagster.core.storage.mem_io_manager import InMemoryIOManager


def test_with_replaced_asset_keys():
    @asset(ins={"input2": AssetIn(namespace="something_else")})
    def asset1(input1, input2):
        assert input1
        assert input2

    replaced = asset1.with_replaced_asset_keys(
        output_asset_key_replacements={
            AssetKey(["asset1"]): AssetKey(["prefix1", "asset1_changed"])
        },
        input_asset_key_replacements={
            AssetKey(["something_else", "input2"]): AssetKey(["apple", "banana"])
        },
    )

    assert set(replaced.dependency_asset_keys) == {
        AssetKey("input1"),
        AssetKey(["apple", "banana"]),
    }
    assert replaced.asset_keys == {AssetKey(["prefix1", "asset1_changed"])}

    assert replaced.asset_keys_by_input_name["input1"] == AssetKey("input1")

    assert replaced.asset_keys_by_input_name["input2"] == AssetKey(["apple", "banana"])

    assert replaced.asset_keys_by_output_name["result"] == AssetKey(["prefix1", "asset1_changed"])


@pytest.mark.parametrize(
    "subset,expected_keys,expected_inputs,expected_outputs",
    [
        ("foo,bar,baz,in1,in2,in3,a,b,c,foo2,bar2,baz2", "a,b,c", 3, 3),
        ("foo,bar,baz", None, 0, 0),
        ("in1,a,b,c", "a,b,c", 3, 3),
        ("foo,in1,a,b,c,bar", "a,b,c", 3, 3),
        ("foo,in1,in2,in3,a,bar", "a", 2, 1),
        ("foo,in1,in2,a,b,bar", "a,b", 2, 2),
        ("in1,in2,in3,b", "b", 0, 1),
    ],
)
def test_subset_for(subset, expected_keys, expected_inputs, expected_outputs):
    @multi_asset(
        outs={"a": Out(), "b": Out(), "c": Out()},
        internal_asset_deps={
            "a": {AssetKey("in1"), AssetKey("in2")},
            "b": set(),
            "c": {AssetKey("a"), AssetKey("b"), AssetKey("in2"), AssetKey("in3")},
        },
        can_subset=True,
    )
    def abc_(context, in1, in2, in3):  # pylint: disable=unused-argument
        pass

    subbed = abc_.subset_for({AssetKey(key) for key in subset.split(",")})

    assert subbed.asset_keys == (
        {AssetKey(key) for key in expected_keys.split(",")} if expected_keys else set()
    )

    assert len(subbed.asset_keys_by_input_name) == expected_inputs
    assert len(subbed.asset_keys_by_output_name) == expected_outputs

    # the asset dependency structure should stay the same
    assert subbed.asset_deps == abc_.asset_deps


def test_chain_replace_and_subset_for():
    @multi_asset(
        outs={"a": Out(), "b": Out(), "c": Out()},
        internal_asset_deps={
            "a": {AssetKey("in1"), AssetKey("in2")},
            "b": set(),
            "c": {AssetKey("a"), AssetKey("b"), AssetKey("in2"), AssetKey("in3")},
        },
        can_subset=True,
    )
    def abc_(context, in1, in2, in3):  # pylint: disable=unused-argument
        pass

    replaced_1 = abc_.with_replaced_asset_keys(
        output_asset_key_replacements={AssetKey(["a"]): AssetKey(["foo", "foo_a"])},
        input_asset_key_replacements={AssetKey(["in1"]): AssetKey(["foo", "bar_in1"])},
    )

    assert replaced_1.asset_keys == {AssetKey(["foo", "foo_a"]), AssetKey("b"), AssetKey("c")}
    assert replaced_1.asset_deps == {
        AssetKey(["foo", "foo_a"]): {AssetKey(["foo", "bar_in1"]), AssetKey("in2")},
        AssetKey("b"): set(),
        AssetKey("c"): {
            AssetKey(["foo", "foo_a"]),
            AssetKey("b"),
            AssetKey("in2"),
            AssetKey("in3"),
        },
    }

    subbed_1 = replaced_1.subset_for(
        {AssetKey(["foo", "bar_in1"]), AssetKey("in3"), AssetKey(["foo", "foo_a"]), AssetKey("b")}
    )
    assert subbed_1.asset_keys == {AssetKey(["foo", "foo_a"]), AssetKey("b")}

    replaced_2 = subbed_1.with_replaced_asset_keys(
        output_asset_key_replacements={
            AssetKey(["foo", "foo_a"]): AssetKey(["again", "foo", "foo_a"]),
            AssetKey(["b"]): AssetKey(["something", "bar_b"]),
        },
        input_asset_key_replacements={
            AssetKey(["foo", "bar_in1"]): AssetKey(["again", "foo", "bar_in1"]),
            AssetKey(["in2"]): AssetKey(["foo", "in2"]),
            AssetKey(["in3"]): AssetKey(["foo", "in3"]),
        },
    )
    assert replaced_2.asset_keys == {
        AssetKey(["again", "foo", "foo_a"]),
        AssetKey(["something", "bar_b"]),
    }
    assert replaced_2.asset_deps == {
        AssetKey(["again", "foo", "foo_a"]): {
            AssetKey(["again", "foo", "bar_in1"]),
            AssetKey(["foo", "in2"]),
        },
        AssetKey(["something", "bar_b"]): set(),
        AssetKey("c"): {
            AssetKey(["again", "foo", "foo_a"]),
            AssetKey(["something", "bar_b"]),
            AssetKey(["foo", "in2"]),
            AssetKey(["foo", "in3"]),
        },
    }

    subbed_2 = replaced_2.subset_for(
        {
            AssetKey(["again", "foo", "bar_in1"]),
            AssetKey(["again", "foo", "foo_a"]),
            AssetKey(["c"]),
        }
    )
    assert subbed_2.asset_keys == {AssetKey(["again", "foo", "foo_a"])}


def test_fail_on_subset_for_nonsubsettable():
    @multi_asset(outs={"a": Out(), "b": Out(), "c": Out()})
    def abc_(context, start):  # pylint: disable=unused-argument
        pass

    with pytest.raises(CheckError, match="can_subset=False"):
        abc_.subset_for({AssetKey("start"), AssetKey("a")})


def test_to_source_assets():
    @asset(metadata={"a": "b"}, io_manager_key="abc", description="blablabla")
    def my_asset():
        ...

    assert my_asset.to_source_assets() == [
        SourceAsset(
            AssetKey(["my_asset"]),
            metadata={"a": "b"},
            io_manager_key="abc",
            description="blablabla",
        )
    ]

    @multi_asset(
        outs={
            "my_out_name": Out(
                asset_key=AssetKey("my_asset_name"),
                metadata={"a": "b"},
                io_manager_key="abc",
                description="blablabla",
            ),
            "my_other_out_name": Out(
                asset_key=AssetKey("my_other_asset"),
                metadata={"c": "d"},
                io_manager_key="def",
                description="ablablabl",
            ),
        }
    )
    def my_multi_asset():
        yield Output(1, "my_out_name")
        yield Output(2, "my_other_out_name")

    assert my_multi_asset.to_source_assets() == [
        SourceAsset(
            AssetKey(["my_asset_name"]),
            metadata={"a": "b"},
            io_manager_key="abc",
            description="blablabla",
        ),
        SourceAsset(
            AssetKey(["my_other_asset"]),
            metadata={"c": "d"},
            io_manager_key="def",
            description="ablablabl",
        ),
    ]


def test_coerced_asset_keys():
    @asset(ins={"input1": AssetIn(asset_key=["Asset", "1"])})
    def asset1(input1):
        assert input1


def test_asset_with_io_manager_def():
    events = []

    class MyIOManager(IOManager):
        def handle_output(self, context, _obj):
            events.append(f"entered for {context.step_key}")

        def load_input(self, _context):
            pass

    @io_manager
    def the_io_manager():
        return MyIOManager()

    @asset(io_manager_def=the_io_manager)
    def the_asset():
        pass

    result = AssetGroup([the_asset]).materialize()
    assert result.success
    assert events == ["entered for the_asset"]


def test_multiple_assets_io_manager_defs():
    io_manager_inst = InMemoryIOManager()
    num_times = [0]

    @io_manager
    def the_io_manager():
        num_times[0] += 1
        return io_manager_inst

    # Under the hood, these io managers are mapped to different asset keys, so
    # we expect the io manager initialization to be called multiple times.
    @asset(io_manager_def=the_io_manager)
    def the_asset():
        return 5

    @asset(io_manager_def=the_io_manager)
    def other_asset():
        return 6

    AssetGroup([the_asset, other_asset]).materialize()

    assert num_times[0] == 2

    the_asset_key = [key for key in io_manager_inst.values.keys() if key[1] == "the_asset"][0]
    assert io_manager_inst.values[the_asset_key] == 5

    other_asset_key = [key for key in io_manager_inst.values.keys() if key[1] == "other_asset"][0]
    assert io_manager_inst.values[other_asset_key] == 6


def test_asset_with_io_manager_key_only():
    io_manager_inst = InMemoryIOManager()

    @io_manager
    def the_io_manager():
        return io_manager_inst

    @asset(io_manager_key="the_key")
    def the_asset():
        return 5

    AssetGroup([the_asset], resource_defs={"the_key": the_io_manager}).materialize()

    assert list(io_manager_inst.values.values())[0] == 5


def test_asset_both_io_manager_args_provided():
    @io_manager
    def the_io_manager():
        pass

    with pytest.raises(
        CheckError,
        match="Both io_manager_key and io_manager_def were provided to `@asset` "
        "decorator. Please provide one or the other.",
    ):

        @asset(io_manager_key="the_key", io_manager_def=the_io_manager)
        def the_asset():
            pass
