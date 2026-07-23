using System.Threading.Tasks;

namespace QuickBite.Identity.Data;

public interface IIdentityDbSchemaMigrator
{
    Task MigrateAsync();
}
