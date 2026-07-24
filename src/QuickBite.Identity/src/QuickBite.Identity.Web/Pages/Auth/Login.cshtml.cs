using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Volo.Abp.Identity;
using AbpIdentityUser = Volo.Abp.Identity.IdentityUser;
namespace QuickBite.Identity.Web.Pages.Auth;

public class LoginModel : PageModel
{
    private readonly IdentityUserManager _userManager;
    private readonly SignInManager<AbpIdentityUser> _signInManager;

    public LoginModel(
        IdentityUserManager userManager,
        SignInManager<AbpIdentityUser> signInManager)
    {
        _userManager = userManager;
        _signInManager = signInManager;
    }

    [BindProperty]
    public LoginInputModel LoginInput { get; set; } = new();

    public void OnGet()
    {
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        // Tìm user
        var user = await _userManager.FindByNameAsync(
            LoginInput.UserNameOrEmailAddress
        );
var roles = await _userManager.GetRolesAsync(user);
        if (user is null)
        {
            ModelState.AddModelError(
                string.Empty,
                "Username hoặc Password không đúng."
            );

            return Page();
        }

        // Kiểm tra password
        var result = await _signInManager.CheckPasswordSignInAsync(
            user,
            LoginInput.Password,
            lockoutOnFailure: true
        );

        if (!result.Succeeded)
        {
            ModelState.AddModelError(
                string.Empty,
                "Username hoặc Password không đúng."
            );

            return Page();
        }

        // Login bằng Cookie Authentication
        await _signInManager.SignInAsync(
            user,
            LoginInput.RememberMe
        );

        return Redirect("~/");
    }
}