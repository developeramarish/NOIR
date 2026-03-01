using NOIR.Application.Features.Crm.Commands.CreatePipeline;
using NOIR.Application.Features.Crm.Commands.UpdatePipeline;
using NOIR.Application.Features.Crm.Commands.DeletePipeline;
using NOIR.Application.Features.Crm.Queries.GetPipelines;
using NOIR.Application.Features.Crm.Queries.GetPipelineView;
using NOIR.Application.Features.Crm.Queries.GetCrmDashboard;
using NOIR.Application.Features.Crm.DTOs;

namespace NOIR.Web.Endpoints;

public static class PipelineEndpoints
{
    public static void MapPipelineEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/crm/pipelines")
            .WithTags("CRM - Pipelines")
            .RequireFeature(ModuleNames.Erp.Crm)
            .RequireAuthorization();

        group.MapGet("/", async (IMessageBus bus) =>
        {
            var query = new GetPipelinesQuery();
            var result = await bus.InvokeAsync<Result<List<PipelineDto>>>(query);
            return result.ToHttpResult();
        })
        .RequireAuthorization(Permissions.CrmLeadsRead)
        .WithName("GetPipelines")
        .WithSummary("Get all pipelines with stages")
        .Produces<List<PipelineDto>>(StatusCodes.Status200OK);

        group.MapGet("/{id:guid}/view", async (
            Guid id,
            [FromQuery] bool? includeClosedDeals,
            IMessageBus bus) =>
        {
            var query = new GetPipelineViewQuery(id, includeClosedDeals ?? false);
            var result = await bus.InvokeAsync<Result<PipelineViewDto>>(query);
            return result.ToHttpResult();
        })
        .RequireAuthorization(Permissions.CrmLeadsRead)
        .WithName("GetPipelineView")
        .WithSummary("Get pipeline Kanban view with leads grouped by stage")
        .Produces<PipelineViewDto>(StatusCodes.Status200OK)
        .Produces<ProblemDetails>(StatusCodes.Status404NotFound);

        group.MapPost("/", async (
            CreatePipelineRequest request,
            [FromServices] ICurrentUser currentUser,
            IMessageBus bus) =>
        {
            var command = new CreatePipelineCommand(request.Name, request.IsDefault, request.Stages)
            {
                AuditUserId = currentUser.UserId
            };
            var result = await bus.InvokeAsync<Result<PipelineDto>>(command);
            return result.ToHttpResult();
        })
        .RequireAuthorization(Permissions.CrmPipelineManage)
        .WithName("CreatePipeline")
        .WithSummary("Create a new pipeline with stages")
        .Produces<PipelineDto>(StatusCodes.Status200OK)
        .Produces<ProblemDetails>(StatusCodes.Status400BadRequest);

        group.MapPut("/{id:guid}", async (
            Guid id,
            UpdatePipelineRequest request,
            [FromServices] ICurrentUser currentUser,
            IMessageBus bus) =>
        {
            var command = new UpdatePipelineCommand(id, request.Name, request.IsDefault, request.Stages)
            {
                AuditUserId = currentUser.UserId
            };
            var result = await bus.InvokeAsync<Result<PipelineDto>>(command);
            return result.ToHttpResult();
        })
        .RequireAuthorization(Permissions.CrmPipelineManage)
        .WithName("UpdatePipeline")
        .WithSummary("Update a pipeline and its stages")
        .Produces<PipelineDto>(StatusCodes.Status200OK)
        .Produces<ProblemDetails>(StatusCodes.Status400BadRequest)
        .Produces<ProblemDetails>(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:guid}", async (
            Guid id,
            [FromServices] ICurrentUser currentUser,
            IMessageBus bus) =>
        {
            var command = new DeletePipelineCommand(id) { AuditUserId = currentUser.UserId };
            var result = await bus.InvokeAsync<Result<PipelineDto>>(command);
            return result.ToHttpResult();
        })
        .RequireAuthorization(Permissions.CrmPipelineManage)
        .WithName("DeletePipeline")
        .WithSummary("Delete a pipeline")
        .Produces<PipelineDto>(StatusCodes.Status200OK)
        .Produces<ProblemDetails>(StatusCodes.Status400BadRequest)
        .Produces<ProblemDetails>(StatusCodes.Status404NotFound);

        // CRM Dashboard (placed here as a general CRM endpoint)
        app.MapGroup("/api/crm")
            .WithTags("CRM - Dashboard")
            .RequireFeature(ModuleNames.Erp.Crm)
            .RequireAuthorization()
            .MapGet("/dashboard", async (IMessageBus bus) =>
            {
                var query = new GetCrmDashboardQuery();
                var result = await bus.InvokeAsync<Result<CrmDashboardDto>>(query);
                return result.ToHttpResult();
            })
            .RequireAuthorization(Permissions.CrmLeadsRead)
            .WithName("GetCrmDashboard")
            .WithSummary("Get CRM dashboard aggregate data")
            .Produces<CrmDashboardDto>(StatusCodes.Status200OK);
    }
}
