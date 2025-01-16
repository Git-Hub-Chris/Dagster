import tempfile
import webbrowser
from collections.abc import Iterator, Mapping, Sequence
from typing import Any, Union

import markdown
import yaml
from dagster._utils.source_position import SourcePositionTree
from dagster._utils.yaml_utils import parse_yaml_with_source_positions
from dagster_components.core.schema.metadata import get_required_scope

from dagster_dg.component import RemoteComponentType

REF_BASE = "#/$defs/"


def _dereference_schema(
    json_schema: Mapping[str, Any], subschema: Mapping[str, Any]
) -> Mapping[str, Any]:
    if "$ref" in subschema:
        return json_schema["$defs"].get(subschema["$ref"][len(REF_BASE) :])
    else:
        return subschema


def _sample_value_for_subschema(
    json_schema: Mapping[str, Any], subschema: Mapping[str, Any]
) -> Any:
    subschema = _dereference_schema(json_schema, subschema)
    if "anyOf" in subschema:
        # TODO: handle anyOf fields more gracefully, for now just choose first option
        return _sample_value_for_subschema(json_schema, subschema["anyOf"][0])

    objtype = subschema["type"]
    if objtype == "object":
        return {
            k: _sample_value_for_subschema(json_schema, v)
            for k, v in subschema.get("properties", {}).items()
        }
    elif objtype == "array":
        return [_sample_value_for_subschema(json_schema, subschema["items"])]
    elif objtype == "string":
        return "..."
    elif objtype == "integer":
        return 0
    elif objtype == "boolean":
        return False
    else:
        return f"({objtype})"


class ComponentDumper(yaml.SafeDumper):
    def increase_indent(self, flow=False, *args, **kwargs):
        # makes the output somewhat prettier by forcing lists to be indented
        return super().increase_indent(flow=flow, indentless=False)

    def write_line_break(self) -> None:
        # add an extra line break between top-level keys
        if self.indent == 0:
            super().write_line_break()
        super().write_line_break()


def _get_source_position_comments(
    valpath: Sequence[Union[str, int]], tree: SourcePositionTree, json_schema: Mapping[str, Any]
) -> Iterator[tuple[int, str]]:
    available_scope = get_required_scope(valpath[1:], json_schema)
    if available_scope:
        yield (tree.position.start.line - 1, f"Available scope: {available_scope}")
    for child_path, child_tree in tree.children.items():
        yield from _get_source_position_comments([*valpath, child_path], child_tree, json_schema)


def generate_sample_yaml(component_type: str, json_schema: Mapping[str, Any]) -> str:
    raw = yaml.dump(
        {"type": component_type, "params": _sample_value_for_subschema(json_schema, json_schema)},
        Dumper=ComponentDumper,
        sort_keys=False,
    )
    parsed = parse_yaml_with_source_positions(raw)
    comments = dict(_get_source_position_comments([], parsed.source_position_tree, json_schema))
    commented_lines = []
    for line_num, line in enumerate(raw.split("\n")):
        if line_num in comments:
            commented_lines.append(f"{line} # {comments[line_num]}")
        else:
            commented_lines.append(line)
    return "\n".join(commented_lines)


def render_markdown_in_browser(markdown_content: str) -> None:
    # Convert the markdown string to HTML
    html_content = markdown.markdown(markdown_content)

    # Add basic HTML structure
    full_html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Markdown Preview</title>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """

    # Create a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".html") as temp_file:
        temp_file.write(full_html.encode("utf-8"))
        temp_file_path = temp_file.name

    # Open the temporary file in the default web browser
    webbrowser.open(f"file://{temp_file_path}")


def markdown_for_component_type(remote_component_type: RemoteComponentType) -> str:
    component_type_name = f"{remote_component_type.package}.{remote_component_type.name}"
    sample_yaml = generate_sample_yaml(
        component_type_name, remote_component_type.component_params_schema or {}
    )
    rows = len(sample_yaml.split("\n")) + 1
    return f"""
## Component: `{component_type_name}`
 
### Description: 
{remote_component_type.description}

### Sample Component Params:

<textarea rows={rows} cols=100>
{sample_yaml}
</textarea>
"""
