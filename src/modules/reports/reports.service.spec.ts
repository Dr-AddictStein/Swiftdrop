import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './reports.repository';

describe('ReportsService', () => {
  let service: ReportsService;
  let reportsRepository: jest.Mocked<
    Pick<ReportsRepository, 'getAgentSummaries'>
  >;

  beforeEach(async () => {
    reportsRepository = {
      getAgentSummaries: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: ReportsRepository, useValue: reportsRepository },
      ],
    }).compile();

    service = module.get(ReportsService);
  });

  it('maps repository rows into report summaries', async () => {
    reportsRepository.getAgentSummaries.mockResolvedValue([
      {
        agentId: 'agent-1',
        agentName: 'Agent One',
        agentEmail: 'agent1@swiftdrop.com',
        totalDeliveries: 8,
        failedAttempts: 2,
        averagePickupToDeliverySeconds: 3600,
      },
      {
        agentId: 'agent-2',
        agentName: 'Agent Two',
        agentEmail: 'agent2@swiftdrop.com',
        totalDeliveries: 0,
        failedAttempts: 0,
        averagePickupToDeliverySeconds: null,
      },
    ]);

    await expect(service.getAgentSummaries('company-1')).resolves.toEqual([
      {
        agentId: 'agent-1',
        agentName: 'Agent One',
        agentEmail: 'agent1@swiftdrop.com',
        totalDeliveries: 8,
        successRate: 80,
        averagePickupToDeliveryMinutes: 60,
      },
      {
        agentId: 'agent-2',
        agentName: 'Agent Two',
        agentEmail: 'agent2@swiftdrop.com',
        totalDeliveries: 0,
        successRate: 0,
        averagePickupToDeliveryMinutes: null,
      },
    ]);
    expect(reportsRepository.getAgentSummaries).toHaveBeenCalledWith(
      'company-1',
    );
  });

  describe('toSummary', () => {
    it('calculates success rate from delivered and failed parcels', () => {
      expect(
        service.toSummary({
          agentId: 'agent-1',
          agentName: 'Agent',
          agentEmail: 'agent@swiftdrop.com',
          totalDeliveries: 3,
          failedAttempts: 1,
          averagePickupToDeliverySeconds: 1800,
        }),
      ).toEqual({
        agentId: 'agent-1',
        agentName: 'Agent',
        agentEmail: 'agent@swiftdrop.com',
        totalDeliveries: 3,
        successRate: 75,
        averagePickupToDeliveryMinutes: 30,
      });
    });

    it('returns zero success rate when there are no completed attempts', () => {
      expect(
        service.toSummary({
          agentId: 'agent-1',
          agentName: 'Agent',
          agentEmail: 'agent@swiftdrop.com',
          totalDeliveries: 0,
          failedAttempts: 0,
          averagePickupToDeliverySeconds: null,
        }).successRate,
      ).toBe(0);
    });
  });
});
