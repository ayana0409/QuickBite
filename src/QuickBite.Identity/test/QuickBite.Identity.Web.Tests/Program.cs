using Microsoft.AspNetCore.Builder;
using QuickBite.Identity;
using Volo.Abp.AspNetCore.TestBase;

var builder = WebApplication.CreateBuilder();

builder.Environment.ContentRootPath = GetWebProjectContentRootPathHelper.Get("QuickBite.Identity.Web.csproj");
await builder.RunAbpModuleAsync<IdentityWebTestModule>(applicationName: "QuickBite.Identity.Web" );

public partial class Program
{
}
