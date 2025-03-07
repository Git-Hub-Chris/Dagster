import logging
import os
import traceback
import uuid
from collections.abc import Sequence
from types import TracebackType
from typing import Any, NamedTuple, Optional, Union

from typing_extensions import TypeAlias

import dagster._check as check
from dagster._serdes import whitelist_for_serdes


# mypy does not support recursive types, so "cause" has to be typed `Any`
@whitelist_for_serdes
class SerializableErrorInfo(
    NamedTuple(
        "SerializableErrorInfo",
        [
            ("message", str),
            ("stack", Sequence[str]),
            ("cls_name", Optional[str]),
            ("cause", Any),
            ("context", Any),
        ],
    )
):
    # serdes log
    # * added cause - default to None in constructor to allow loading old entries
    # * added context - default to None for similar reasons
    #
    def __new__(
        cls,
        message: str,
        stack: Sequence[str],
        cls_name: Optional[str],
        cause: Optional["SerializableErrorInfo"] = None,
        context: Optional["SerializableErrorInfo"] = None,
    ):
        return super().__new__(cls, message, stack, cls_name, cause, context)

    def __str__(self) -> str:
        return self.to_string()

    def to_string(self) -> str:
        stack_str = "\nStack Trace:\n" + "".join(self.stack) if self.stack else ""
        cause_str = (
            "\nThe above exception was caused by the following exception:\n"
            + self.cause.to_string()
            if self.cause
            else ""
        )
        context_str = (
            "\nThe above exception occurred during handling of the following exception:\n"
            + self.context.to_string()
            if self.context
            else ""
        )

        return f"{self.message}{stack_str}{cause_str}{context_str}"

    def to_exception_message_only(self) -> "SerializableErrorInfo":
        """Return a new SerializableErrorInfo with only the message and cause set.

        This is done in cases when the context about the error should not be exposed to the user.
        """
        return SerializableErrorInfo(message=self.message, stack=[], cls_name=self.cls_name)


def _serializable_error_info_from_tb(tb: traceback.TracebackException) -> SerializableErrorInfo:
    return SerializableErrorInfo(
        # usually one entry, multiple lines for SyntaxError
        "".join(list(tb.format_exception_only())),
        tb.stack.format(),
        tb.exc_type.__name__ if tb.exc_type is not None else None,
        _serializable_error_info_from_tb(tb.__cause__) if tb.__cause__ else None,
        _serializable_error_info_from_tb(tb.__context__) if tb.__context__ else None,
    )


ExceptionInfo: TypeAlias = Union[
    tuple[type[BaseException], BaseException, TracebackType],
    tuple[None, None, None],
]


def _should_redact_user_code_error() -> bool:
    return str(os.getenv("DAGSTER_REDACT_USER_CODE_ERRORS")).lower() in ("1", "true", "t")


_REDACTED_ERROR_LOGGER_NAME = os.getenv(
    "DAGSTER_REDACTED_ERROR_LOGGER_NAME", "dagster.redacted_errors"
)


def serializable_error_info_from_exc_info(
    exc_info: ExceptionInfo,
    # Whether to forward serialized errors thrown from subprocesses
    hoist_user_code_error: Optional[bool] = True,
) -> SerializableErrorInfo:
    """This function is used to turn an exception into a serializable object that can be passed
    across process boundaries or sent over GraphQL.

    Args:
        exc_info (ExceptionInfo): The exception info to serialize
        hoist_user_code_error (Optional[bool]): Whether to extract the inner user code error if the raised exception
            is a DagsterUserCodeProcessError. Defaults to True.
    """
    # `sys.exc_info() return Tuple[None, None, None] when there is no exception being processed. We accept this in
    # the type signature here since this function is meant to directly receive the return value of
    # `sys.exc_info`, but the function should never be called when there is no exception to process.
    exc_type, e, tb = exc_info
    additional_message = "sys.exc_info() called but no exception available to process."
    exc_type = check.not_none(exc_type, additional_message=additional_message)
    e = check.not_none(e, additional_message=additional_message)
    tb = check.not_none(tb, additional_message=additional_message)

    from dagster._core.errors import DagsterUserCodeExecutionError, DagsterUserCodeProcessError

    if isinstance(e, DagsterUserCodeExecutionError) and _should_redact_user_code_error():
        error_id = str(uuid.uuid4())
        masked_logger = logging.getLogger(_REDACTED_ERROR_LOGGER_NAME)

        masked_logger.error(
            f"Error occurred during user code execution, error ID {error_id}",
            exc_info=exc_info,
        )
        return SerializableErrorInfo(
            message=(
                f"Error occurred during user code execution, error ID {error_id}. "
                "The error has been masked to prevent leaking sensitive information. "
                "Search in logs for this error ID for more details."
            ),
            stack=[],
            cls_name="DagsterRedactedUserCodeError",
            cause=None,
            context=None,
        )

    if (
        hoist_user_code_error
        and isinstance(e, DagsterUserCodeProcessError)
        and len(e.user_code_process_error_infos) == 1
    ):
        return e.user_code_process_error_infos[0]
    else:
        tb_exc = traceback.TracebackException(exc_type, e, tb)
        return _serializable_error_info_from_tb(tb_exc)
