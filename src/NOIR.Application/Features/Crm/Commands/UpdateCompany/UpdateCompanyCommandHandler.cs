namespace NOIR.Application.Features.Crm.Commands.UpdateCompany;

public class UpdateCompanyCommandHandler
{
    private readonly IRepository<CrmCompany, Guid> _companyRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateCompanyCommandHandler(
        IRepository<CrmCompany, Guid> companyRepository,
        IUnitOfWork unitOfWork)
    {
        _companyRepository = companyRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Features.Crm.DTOs.CompanyDto>> Handle(
        UpdateCompanyCommand command,
        CancellationToken cancellationToken)
    {
        var spec = new Specifications.CompanyByIdSpec(command.Id);
        var company = await _companyRepository.FirstOrDefaultAsync(spec, cancellationToken);

        if (company is null)
        {
            return Result.Failure<Features.Crm.DTOs.CompanyDto>(
                Error.NotFound($"Company with ID '{command.Id}' not found.", "NOIR-CRM-011"));
        }

        // Validate name uniqueness (exclude self)
        var nameSpec = new Specifications.CompanyByNameSpec(command.Name, command.Id);
        var existingByName = await _companyRepository.FirstOrDefaultAsync(nameSpec, cancellationToken);
        if (existingByName is not null)
        {
            return Result.Failure<Features.Crm.DTOs.CompanyDto>(
                Error.Conflict($"A company with name '{command.Name}' already exists.", "NOIR-CRM-010"));
        }

        company.Update(
            command.Name,
            command.Domain,
            command.Industry,
            command.Address,
            command.Phone,
            command.Website,
            command.OwnerId,
            command.TaxId,
            command.EmployeeCount,
            command.Notes);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(MapToDto(company));
    }

    private static Features.Crm.DTOs.CompanyDto MapToDto(CrmCompany c) =>
        new(c.Id, c.Name, c.Domain, c.Industry, c.Address, c.Phone, c.Website,
            c.OwnerId, c.Owner != null ? $"{c.Owner.FirstName} {c.Owner.LastName}" : null,
            c.TaxId, c.EmployeeCount, c.Notes, c.Contacts.Count,
            c.CreatedAt, c.ModifiedAt);
}
