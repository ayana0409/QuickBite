using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Identity;

namespace QuickBite.Identity.Accounts
{
    public interface IAccountService : IApplicationService
    {
        public Task<PagedResultDto<IdentityUserDto>> GetAll(GetIdentityUsersInput input);
        public Task<IdentityUserDto> GetUserAsync(Guid id);
        public Task<IEnumerable<IdentityRoleDto>> GetRoleAsync();
        public Task<IEnumerable<string>> GetRoleAsync(Guid id);
        public Task<IdentityUserDto> CreateUserAsync(IdentityUserCreateDto input);
        public Task<IdentityUserDto> UpdateUserAsync(Guid id, IdentityUserUpdateDto input);
        public Task UpdateUserRolesAsync(Guid id, List<string> roleNames);
        public Task DeleteUserAsync(Guid id);
    }
}
