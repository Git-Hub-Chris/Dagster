from dagster._core.libraries import DagsterLibraryRegistry

from .assets import create_shell_asset
from .ops import create_shell_command_op, create_shell_script_op, shell_op
from .utils import (
    execute as execute_shell_command,
    execute_script_file as execute_shell_script,
)
from .version import __version__

DagsterLibraryRegistry.register("dagster-shell", __version__)

__all__ = [
    "create_shell_command_op",
    "create_shell_asset",
    "create_shell_script_op",
    "shell_op",
    "execute_shell_command",
    "execute_shell_script",
]
