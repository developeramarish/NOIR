namespace NOIR.Application.Features.Crm.Queries.GetCompanies;

public class GetCompaniesQueryHandler
{
    private readonly IRepository<CrmCompany, Guid> _companyRepository;

    public GetCompaniesQueryHandler(IRepository<CrmCompany, Guid> companyRepository)
    {
        _companyRepository = companyRepository;
    }

    public async Task<Result<PagedResult<Features.Crm.DTOs.CompanyListDto>>> Handle(
        GetCompaniesQuery query,
        CancellationToken cancellationToken)
    {
        var skip = (query.Page - 1) * query.PageSize;

        var spec = new Specifications.CompaniesFilterSpec(query.Search, skip, query.PageSize, query.OrderBy, query.IsDescending);
        var companies = await _companyRepository.ListAsync(spec, cancellationToken);

        var countSpec = new Specifications.CompaniesCountSpec(query.Search);
        var totalCount = await _companyRepository.CountAsync(countSpec, cancellationToken);

        var items = companies.Select(c => new Features.Crm.DTOs.CompanyListDto(
            c.Id, c.Name, c.Domain, c.Industry,
            c.Owner != null ? $"{c.Owner.FirstName} {c.Owner.LastName}" : null,
            c.Contacts.Count, c.CreatedAt)).ToList();

        return Result.Success(PagedResult<Features.Crm.DTOs.CompanyListDto>.Create(
            items, totalCount, query.Page - 1, query.PageSize));
    }
}
