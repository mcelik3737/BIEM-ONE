import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TimelineEventsService } from './timeline-events.service';

@ApiTags('timeline-events')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('timeline-events')
export class TimelineEventsController {
  constructor(private readonly timelineEventsService: TimelineEventsService) {}

  @Get()
  findRecent(@Req() request: RequestWithUser) {
    return this.timelineEventsService.findRecent(request.user.companyId);
  }
}
