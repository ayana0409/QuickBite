using Microsoft.AspNetCore.Mvc;
using QuickBite.Identity.Accounts;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;
using Volo.Abp.Authorization;
using Volo.Abp.Identity;

public class IndexModel : AbpPageModel
{
    private readonly IAccountService _accountService;

    public IndexModel(IAccountService accountService)
    {
        _accountService = accountService;
    }

    [BindProperty(SupportsGet = true)]
    public string? Filter { get; set; }

    [BindProperty(SupportsGet = true)]
    public int CurrentPage { get; set; } = 1;

    public const int PageSize = 5;

    public long TotalCount { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public IEnumerable<IdentityUserDto> Users { get; set; } = [];

    public async Task<IActionResult> OnGetAsync()
    {
        try
        {
            var result = await _accountService.GetAll(
                new GetIdentityUsersInput
                {
                    Filter = Filter,
                    SkipCount = (CurrentPage - 1) * PageSize,
                    MaxResultCount = PageSize,
                    Sorting = nameof(IdentityUserDto.UserName)
                });

            Users = result.Items;

            TotalCount = result.TotalCount;

            return Page();
        }
        catch (AbpAuthorizationException)
        {
            return Redirect("/access-denied");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"An error occurred: {ex.Message}");
            ModelState.AddModelError(String.Empty, "$\"An error occurred: {ex.Message}\"");
            return Page();
        }
    }

    public async Task<IActionResult> OnPostDeleteAsync(Guid id)
    {
        try
        {
            await _accountService.DeleteUserAsync(id);

            return RedirectToPage();
        }
        catch (AbpAuthorizationException)
        {
            return Redirect("/access-denied");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"An error occurred: {ex.Message}");
            return Redirect("/error");
        }
    }
}