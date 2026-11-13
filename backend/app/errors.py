class ResourceNotFoundError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class RequestConflictError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)
