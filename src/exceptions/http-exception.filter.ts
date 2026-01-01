import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();

        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // determine status code
        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        // determine error message
        const message =
            exception instanceof HttpException
                ? exception.getResponse()
                : 'Internal server error';

        //log the error
        if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(exception);
        }

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            // Normalize message to always be a string or object, not random text
            message:
                typeof message === 'string'
                    ? message
                    : (message as any).message || message,
        });
    }
}
