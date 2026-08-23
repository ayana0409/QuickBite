using Microsoft.AspNetCore.Identity;
using QuickBite.Identity.Application.Contracts.Auth;
using QuickBite.Identity.Auth;
using System.Threading.Tasks;
using Volo.Abp.Application.Services;
using Volo.Abp.Identity;
using AbpIdentityUser = Volo.Abp.Identity.IdentityUser;

namespace QuickBite.Identity.Application.Auth;
public class AuthService : ApplicationService, IAuthService
{
    private readonly IdentityUserManager _userManager;
    private readonly SignInManager<AbpIdentityUser> _signInManager;

    public AuthService(
        IdentityUserManager userManager,
        SignInManager<AbpIdentityUser> signInManager)
    {
        _userManager = userManager;
        _signInManager = signInManager;
    }

    public async Task<LoginResultDto> LoginAsync(LoginInputDto input)
    {
        // Finding user by username or email address
        var user = await _userManager.FindByNameAsync(input.UserNameOrEmailAddress) 
                   ?? await _userManager.FindByEmailAsync(input.UserNameOrEmailAddress);

        if (user is null)
            return new LoginResultDto()
            {
                ErrorMessage = "User not found",
                Success = false
            };

        // Checking password
        var result = await _signInManager.CheckPasswordSignInAsync(
            user,
            input.Password,
            lockoutOnFailure: true
        );

        if (result.Succeeded)
        {
            await _signInManager.SignInAsync(
                user,
                input.RememberMe
            );

            return new LoginResultDto()
            {
                Success = true
            };
        }
        else
            return new LoginResultDto()
            {
                ErrorMessage = "Username or password is invalid",
                Success = false
            };
    }
}