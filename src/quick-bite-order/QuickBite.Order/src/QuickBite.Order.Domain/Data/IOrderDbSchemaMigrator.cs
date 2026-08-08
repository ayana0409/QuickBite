using System.Threading.Tasks;

namespace QuickBite.Order.Data;

public interface IOrderDbSchemaMigrator
{
    Task MigrateAsync();
}
