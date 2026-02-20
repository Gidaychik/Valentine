using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

var photosPath = builder.Configuration["Photos:Path"];
var photosRequestPath = builder.Configuration["Photos:RequestPath"] ?? "/images/photos";
var resolvedPhotosPath = string.IsNullOrEmpty(photosPath)
    ? Path.Combine(builder.Environment.ContentRootPath, "..", "love_is_photos_archive")
    : Path.IsPathRooted(photosPath) ? photosPath : Path.Combine(builder.Environment.ContentRootPath, photosPath);

var app = builder.Build();

app.UseStaticFiles();

if (Directory.Exists(resolvedPhotosPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(resolvedPhotosPath),
        RequestPath = photosRequestPath
    });
}

app.MapGet("/api/config", () => new { photosBaseUrl = photosRequestPath.TrimEnd('/') });

app.UseDefaultFiles();
app.MapFallbackToFile("index.html");

app.Run();
