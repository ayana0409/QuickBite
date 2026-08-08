using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuickBite.Order.Migrations
{
    /// <inheritdoc />
    public partial class InitDb : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AbpAuditLogExcelFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    TenantId = table.Column<Guid>(type: "char(36)", nullable: true),
                    FileName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: true),
                    CreationTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatorId = table.Column<Guid>(type: "char(36)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbpAuditLogExcelFiles", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AbpAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    ApplicationName = table.Column<string>(type: "varchar(96)", maxLength: 96, nullable: true),
                    UserId = table.Column<Guid>(type: "char(36)", nullable: true),
                    UserName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: true),
                    TenantId = table.Column<Guid>(type: "char(36)", nullable: true),
                    TenantName = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true),
                    ImpersonatorUserId = table.Column<Guid>(type: "char(36)", nullable: true),
                    ImpersonatorUserName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: true),
                    ImpersonatorTenantId = table.Column<Guid>(type: "char(36)", nullable: true),
                    ImpersonatorTenantName = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true),
                    ExecutionTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    ExecutionDuration = table.Column<int>(type: "int", nullable: false),
                    ClientIpAddress = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true),
                    ClientName = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true),
                    ClientId = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true),
                    CorrelationId = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true),
                    BrowserInfo = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true),
                    HttpMethod = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: true),
                    Url = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: true),
                    Exceptions = table.Column<string>(type: "longtext", nullable: true),
                    Comments = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: true),
                    HttpStatusCode = table.Column<int>(type: "int", nullable: true),
                    ExtraProperties = table.Column<string>(type: "longtext", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbpAuditLogs", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AbpBackgroundJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    ApplicationName = table.Column<string>(type: "varchar(96)", maxLength: 96, nullable: true),
                    JobName = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    JobArgs = table.Column<string>(type: "longtext", maxLength: 1048576, nullable: false),
                    TryCount = table.Column<short>(type: "smallint", nullable: false, defaultValue: (short)0),
                    CreationTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    NextTryTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    LastTryTime = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    IsAbandoned = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    Priority = table.Column<byte>(type: "tinyint unsigned", nullable: false, defaultValue: (byte)15),
                    ExtraProperties = table.Column<string>(type: "longtext", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbpBackgroundJobs", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AbpFeatureGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    Name = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    DisplayName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false),
                    ExtraProperties = table.Column<string>(type: "longtext", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbpFeatureGroups", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AbpFeatures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    GroupName = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    Name = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    ParentName = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true),
                    DisplayName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: true),
                    DefaultValue = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: true),
                    IsVisibleToClients = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsAvailableToHost = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    AllowedProviders = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: true),
                    ValueType = table.Column<string>(type: "varchar(2048)", maxLength: 2048, nullable: true),
                    ExtraProperties = table.Column<string>(type: "longtext", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbpFeatures", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AbpFeatureValues",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    Name = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    Value = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    ProviderName = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true),
                    ProviderKey = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbpFeatureValues", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AbpSettingDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    Name = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    DisplayName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true),
                    DefaultValue = table.Column<string>(type: "varchar(2048)", maxLength: 2048, nullable: true),
                    IsVisibleToClients = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Providers = table.Column<string>(type: "varchar(1024)", maxLength: 1024, nullable: true),
                    IsInherited = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsEncrypted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    ExtraProperties = table.Column<string>(type: "longtext", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbpSettingDefinitions", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AbpSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    Name = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    Value = table.Column<string>(type: "varchar(2048)", maxLength: 2048, nullable: false),
                    ProviderName = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true),
                    ProviderKey = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbpSettings", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "InboxMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    EventId = table.Column<Guid>(type: "char(36)", nullable: false),
                    EventType = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    Consumer = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false),
                    Payload = table.Column<string>(type: "longtext", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    ExtraProperties = table.Column<string>(type: "longtext", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatorId = table.Column<Guid>(type: "char(36)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InboxMessages", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Orders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    OrderCode = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    CustomerId = table.Column<Guid>(type: "char(36)", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "char(36)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(14,2)", precision: 14, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "varchar(8)", maxLength: 8, nullable: false),
                    DeliveryAddress_FullName = table.Column<string>(type: "longtext", nullable: false),
                    DeliveryAddress_PhoneNumber = table.Column<string>(type: "longtext", nullable: false),
                    DeliveryAddress_AddressLine = table.Column<string>(type: "longtext", nullable: false),
                    DeliveryAddress_Ward = table.Column<string>(type: "longtext", nullable: false),
                    DeliveryAddress_District = table.Column<string>(type: "longtext", nullable: false),
                    DeliveryAddress_Province = table.Column<string>(type: "longtext", nullable: false),
                    DeliveryAddress_Note = table.Column<string>(type: "longtext", nullable: false),
                    CorrelationId = table.Column<Guid>(type: "char(36)", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false),
                    ExtraProperties = table.Column<string>(type: "longtext", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatorId = table.Column<Guid>(type: "char(36)", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "char(36)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    DeleterId = table.Column<Guid>(type: "char(36)", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "OrderSagaStates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    CorrelationId = table.Column<Guid>(type: "char(36)", nullable: false),
                    OrderId = table.Column<Guid>(type: "char(36)", nullable: false),
                    CurrentState = table.Column<int>(type: "int", nullable: false),
                    StockReserved = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    PaymentAuthorized = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    RestaurantAccepted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    StepTimeoutAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    RestaurantAcceptDeadline = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    RetryCount = table.Column<int>(type: "int", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    ExtraProperties = table.Column<string>(type: "longtext", nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatorId = table.Column<Guid>(type: "char(36)", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "char(36)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    DeleterId = table.Column<Guid>(type: "char(36)", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderSagaStates", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "OutboxMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    EventId = table.Column<Guid>(type: "char(36)", nullable: false),
                    EventType = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    Topic = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false),
                    PartitionKey = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false),
                    CorrelationId = table.Column<Guid>(type: "char(36)", nullable: false),
                    Payload = table.Column<string>(type: "longtext", nullable: false),
                    Status = table.Column<string>(type: "varchar(255)", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    RetryCount = table.Column<int>(type: "int", nullable: false),
                    ExtraProperties = table.Column<string>(type: "longtext", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatorId = table.Column<Guid>(type: "char(36)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboxMessages", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AbpAuditLogActions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    TenantId = table.Column<Guid>(type: "char(36)", nullable: true),
                    AuditLogId = table.Column<Guid>(type: "char(36)", nullable: false),
                    ServiceName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: true),
                    MethodName = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true),
                    Parameters = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true),
                    ExecutionTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    ExecutionDuration = table.Column<int>(type: "int", nullable: false),
                    ExtraProperties = table.Column<string>(type: "longtext", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbpAuditLogActions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AbpAuditLogActions_AbpAuditLogs_AuditLogId",
                        column: x => x.AuditLogId,
                        principalTable: "AbpAuditLogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AbpEntityChanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    AuditLogId = table.Column<Guid>(type: "char(36)", nullable: false),
                    TenantId = table.Column<Guid>(type: "char(36)", nullable: true),
                    ChangeTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    ChangeType = table.Column<byte>(type: "tinyint unsigned", nullable: false),
                    EntityTenantId = table.Column<Guid>(type: "char(36)", nullable: true),
                    EntityId = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true),
                    EntityTypeFullName = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    ExtraProperties = table.Column<string>(type: "longtext", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbpEntityChanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AbpEntityChanges_AbpAuditLogs_AuditLogId",
                        column: x => x.AuditLogId,
                        principalTable: "AbpAuditLogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "OrderItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    OrderId = table.Column<Guid>(type: "char(36)", nullable: false),
                    Sku = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false),
                    ItemName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(14,2)", precision: 14, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderItems_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "OrderStatusHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    OrderId = table.Column<Guid>(type: "char(36)", nullable: false),
                    FromStatus = table.Column<int>(type: "int", nullable: true),
                    ToStatus = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true),
                    ChangedBy = table.Column<int>(type: "int", nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderStatusHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderStatusHistories_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AbpEntityPropertyChanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    TenantId = table.Column<Guid>(type: "char(36)", nullable: true),
                    EntityChangeId = table.Column<Guid>(type: "char(36)", nullable: false),
                    NewValue = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true),
                    OriginalValue = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true),
                    PropertyName = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    PropertyTypeFullName = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbpEntityPropertyChanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AbpEntityPropertyChanges_AbpEntityChanges_EntityChangeId",
                        column: x => x.EntityChangeId,
                        principalTable: "AbpEntityChanges",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_AbpAuditLogActions_AuditLogId",
                table: "AbpAuditLogActions",
                column: "AuditLogId");

            migrationBuilder.CreateIndex(
                name: "IX_AbpAuditLogActions_TenantId_ServiceName_MethodName_Execution~",
                table: "AbpAuditLogActions",
                columns: new[] { "TenantId", "ServiceName", "MethodName", "ExecutionTime" });

            migrationBuilder.CreateIndex(
                name: "IX_AbpAuditLogs_TenantId_ExecutionTime",
                table: "AbpAuditLogs",
                columns: new[] { "TenantId", "ExecutionTime" });

            migrationBuilder.CreateIndex(
                name: "IX_AbpAuditLogs_TenantId_UserId_ExecutionTime",
                table: "AbpAuditLogs",
                columns: new[] { "TenantId", "UserId", "ExecutionTime" });

            migrationBuilder.CreateIndex(
                name: "IX_AbpBackgroundJobs_IsAbandoned_NextTryTime",
                table: "AbpBackgroundJobs",
                columns: new[] { "IsAbandoned", "NextTryTime" });

            migrationBuilder.CreateIndex(
                name: "IX_AbpEntityChanges_AuditLogId",
                table: "AbpEntityChanges",
                column: "AuditLogId");

            migrationBuilder.CreateIndex(
                name: "IX_AbpEntityChanges_TenantId_EntityTypeFullName_EntityId",
                table: "AbpEntityChanges",
                columns: new[] { "TenantId", "EntityTypeFullName", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_AbpEntityPropertyChanges_EntityChangeId",
                table: "AbpEntityPropertyChanges",
                column: "EntityChangeId");

            migrationBuilder.CreateIndex(
                name: "IX_AbpFeatureGroups_Name",
                table: "AbpFeatureGroups",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AbpFeatures_GroupName",
                table: "AbpFeatures",
                column: "GroupName");

            migrationBuilder.CreateIndex(
                name: "IX_AbpFeatures_Name",
                table: "AbpFeatures",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AbpFeatureValues_Name_ProviderName_ProviderKey",
                table: "AbpFeatureValues",
                columns: new[] { "Name", "ProviderName", "ProviderKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AbpSettingDefinitions_Name",
                table: "AbpSettingDefinitions",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AbpSettings_Name_ProviderName_ProviderKey",
                table: "AbpSettings",
                columns: new[] { "Name", "ProviderName", "ProviderKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_OrderId",
                table: "OrderItems",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CustomerId",
                table: "Orders",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_OrderCode",
                table: "Orders",
                column: "OrderCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_RestaurantId",
                table: "Orders",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderSagaStates_CorrelationId",
                table: "OrderSagaStates",
                column: "CorrelationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderSagaStates_RestaurantAcceptDeadline",
                table: "OrderSagaStates",
                column: "RestaurantAcceptDeadline");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStatusHistories_OrderId",
                table: "OrderStatusHistories",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_Status",
                table: "OutboxMessages",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AbpAuditLogActions");

            migrationBuilder.DropTable(
                name: "AbpAuditLogExcelFiles");

            migrationBuilder.DropTable(
                name: "AbpBackgroundJobs");

            migrationBuilder.DropTable(
                name: "AbpEntityPropertyChanges");

            migrationBuilder.DropTable(
                name: "AbpFeatureGroups");

            migrationBuilder.DropTable(
                name: "AbpFeatures");

            migrationBuilder.DropTable(
                name: "AbpFeatureValues");

            migrationBuilder.DropTable(
                name: "AbpSettingDefinitions");

            migrationBuilder.DropTable(
                name: "AbpSettings");

            migrationBuilder.DropTable(
                name: "InboxMessages");

            migrationBuilder.DropTable(
                name: "OrderItems");

            migrationBuilder.DropTable(
                name: "OrderSagaStates");

            migrationBuilder.DropTable(
                name: "OrderStatusHistories");

            migrationBuilder.DropTable(
                name: "OutboxMessages");

            migrationBuilder.DropTable(
                name: "AbpEntityChanges");

            migrationBuilder.DropTable(
                name: "Orders");

            migrationBuilder.DropTable(
                name: "AbpAuditLogs");
        }
    }
}
