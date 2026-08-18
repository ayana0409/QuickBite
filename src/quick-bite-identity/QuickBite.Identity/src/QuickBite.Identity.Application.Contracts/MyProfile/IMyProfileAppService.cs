using System.Threading.Tasks;
using Volo.Abp.Application.Services;

namespace QuickBite.Identity.MyProfile;

/// <summary>
/// Application service contract for the current authenticated user's profile operations.
/// </summary>
public interface IMyProfileAppService : IApplicationService
{
    Task<MyProfileDto> GetAsync();

    Task<MyProfileDto> UpdateAsync(UpdateMyProfileDto input);

    Task ChangePasswordAsync(ChangePasswordDto input);
}
