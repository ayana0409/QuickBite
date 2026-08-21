import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequestService } from './request.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { ProcessRequestDto } from './dto/process-request.dto';
import { QueryRequestDto } from './dto/query-request.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/auth/guards/permission.guard';
import { Permissions } from '@/auth/decorators/permissions.decorator';
import { PermissionKeys } from '@/common/constants/permissions';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

interface JwtUserPayload {
  sub?: string;
  id?: string;
  userId?: string;
  nameid?: string;
  permissions?: string[];
  [key: string]: unknown;
}

@ApiTags('Requests')
@Controller('requests')
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  /**
   * Helper function to extract user ID from JWT payload.
   */
  private extractUserId(user: JwtUserPayload | string | null | undefined): string {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    if (typeof user === 'string') {
      return user;
    }

    const userId = user.sub || user.id || user.userId || user.nameid;
    if (!userId) {
      throw new UnauthorizedException('User identifier not found in token.');
    }

    return userId;
  }

  /**
   * User creates a new catalog request (e.g. Restaurant Registration, Food Report).
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a new catalog request' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload structure' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Conflict (e.g. restaurant slug already exists)' })
  async create(
    @Body() createRequestDto: CreateRequestDto,
    @CurrentUser() user: JwtUserPayload | string,
  ) {
    const userId = this.extractUserId(user);
    return await this.requestService.create(userId, createRequestDto);
  }

  /**
   * Current user retrieves their latest restaurant registration request.
   */
  @Get('my-registration')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user latest restaurant registration request' })
  @ApiResponse({ status: 200, description: 'Latest restaurant registration request or null' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyRegistration(@CurrentUser() user: JwtUserPayload | string) {
    const userId = this.extractUserId(user);
    return await this.requestService.getMyLatestRegistration(userId);
  }

  /**
   * Admin lists all requests with optional filters and pagination.
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.REQUEST_VIEW)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated list of requests (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of catalog requests' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required permission' })
  async findAll(@Query() query: QueryRequestDto) {
    return await this.requestService.findAll(query);
  }

  /**
   * Admin retrieves a single request by ID.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.REQUEST_VIEW)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single request details by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiResponse({ status: 200, description: 'Request found' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return await this.requestService.findOne(id);
  }

  /**
   * Admin processes (approve/reject/resolve) a request.
   */
  @Patch(':id/process')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.REQUEST_PROCESS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a request (Admin only)' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiResponse({ status: 200, description: 'Request processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request / Already processed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiResponse({ status: 409, description: 'Conflict during side-effect execution' })
  async process(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() processDto: ProcessRequestDto,
    @CurrentUser() user: JwtUserPayload | string,
  ) {
    const adminId = this.extractUserId(user);
    return await this.requestService.process(id, processDto, adminId);
  }
}
