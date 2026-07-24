using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;
using Volo.Abp.Authorization;
using Volo.Abp.Identity;

public class IndexModel : AbpPageModel
{
    public List<IdentityUserDto> Users { get; set; } = [];

    private readonly IIdentityUserAppService _identityUserAppService;

    public IndexModel(
        IIdentityUserAppService identityUserAppService)
    {
        _identityUserAppService = identityUserAppService;
    }

    public async Task<IActionResult> OnGetAsync()
    {
        try
        {
            var result =
                await _identityUserAppService.GetListAsync(
                    new GetIdentityUsersInput()
                );

            Users = result.Items.ToList();

            return Page();
        }
        catch (AbpAuthorizationException)
        {
            return Redirect("/access-denied");
        }
    }

    public async Task<IActionResult> OnPostDeleteAsync(Guid id)
    {
        await _identityUserAppService.DeleteAsync(id);

        return RedirectToPage();
    }
}