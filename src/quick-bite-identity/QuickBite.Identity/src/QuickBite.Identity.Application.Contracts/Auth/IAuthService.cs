using QuickBite.Identity.Auth;
using System.Threading.Tasks;
using Volo.Abp.Application.Services;

namespace QuickBite.Identity.Application.Contracts.Auth;

public interface IAuthService : IApplicationService
{
    Task<LoginResultDto> LoginAsync(LoginInputDto input);
    Task<GoogleLoginResultDto> GoogleLoginAsync(GoogleLoginDto input);
}