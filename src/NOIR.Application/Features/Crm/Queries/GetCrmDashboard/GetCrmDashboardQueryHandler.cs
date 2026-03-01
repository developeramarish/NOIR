namespace NOIR.Application.Features.Crm.Queries.GetCrmDashboard;

public class GetCrmDashboardQueryHandler
{
    private readonly IApplicationDbContext _dbContext;

    public GetCrmDashboardQueryHandler(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<Features.Crm.DTOs.CrmDashboardDto>> Handle(
        GetCrmDashboardQuery query,
        CancellationToken cancellationToken)
    {
        var totalContacts = await _dbContext.CrmContacts
            .Where(c => !c.IsDeleted)
            .TagWith("CrmDashboard_TotalContacts")
            .CountAsync(cancellationToken);

        var totalCompanies = await _dbContext.CrmCompanies
            .Where(c => !c.IsDeleted)
            .TagWith("CrmDashboard_TotalCompanies")
            .CountAsync(cancellationToken);

        var activeLeads = await _dbContext.Leads
            .Where(l => !l.IsDeleted && l.Status == LeadStatus.Active)
            .TagWith("CrmDashboard_ActiveLeads")
            .CountAsync(cancellationToken);

        var wonLeads = await _dbContext.Leads
            .Where(l => !l.IsDeleted && l.Status == LeadStatus.Won)
            .TagWith("CrmDashboard_WonLeads")
            .CountAsync(cancellationToken);

        var lostLeads = await _dbContext.Leads
            .Where(l => !l.IsDeleted && l.Status == LeadStatus.Lost)
            .TagWith("CrmDashboard_LostLeads")
            .CountAsync(cancellationToken);

        var totalPipelineValue = await _dbContext.Leads
            .Where(l => !l.IsDeleted && l.Status == LeadStatus.Active)
            .TagWith("CrmDashboard_TotalPipelineValue")
            .SumAsync(l => l.Value, cancellationToken);

        var wonDealValue = await _dbContext.Leads
            .Where(l => !l.IsDeleted && l.Status == LeadStatus.Won)
            .TagWith("CrmDashboard_WonDealValue")
            .SumAsync(l => l.Value, cancellationToken);

        var leadsByStage = await _dbContext.Leads
            .Where(l => !l.IsDeleted && l.Status == LeadStatus.Active)
            .GroupBy(l => new { l.Stage!.Name, l.Stage.Color })
            .Select(g => new Features.Crm.DTOs.LeadsByStageDto(
                g.Key.Name, g.Key.Color, g.Count(), g.Sum(l => l.Value)))
            .OrderByDescending(x => x.Count)
            .TagWith("CrmDashboard_LeadsByStage")
            .ToListAsync(cancellationToken);

        var leadsByOwner = await _dbContext.Leads
            .Where(l => !l.IsDeleted && l.Status == LeadStatus.Active && l.OwnerId != null)
            .GroupBy(l => new { l.Owner!.FirstName, l.Owner.LastName })
            .Select(g => new Features.Crm.DTOs.LeadsByOwnerDto(
                g.Key.FirstName + " " + g.Key.LastName, g.Count(), g.Sum(l => l.Value)))
            .OrderByDescending(x => x.TotalValue)
            .TagWith("CrmDashboard_LeadsByOwner")
            .ToListAsync(cancellationToken);

        return Result.Success(new Features.Crm.DTOs.CrmDashboardDto(
            totalContacts, totalCompanies, activeLeads, wonLeads, lostLeads,
            totalPipelineValue, wonDealValue, leadsByStage, leadsByOwner));
    }
}
