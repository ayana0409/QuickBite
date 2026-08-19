import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract authenticated user information from the request object.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    if (data) {
      return user[data] ?? null;
    }

    return user;
  },
);
