$response = Invoke-RestMethod -Uri "https://auto-parts-catalog.p.rapidapi.com/articles/search-by-article-no?langId=4&articleNo=C%202029" -Headers @{
  "x-rapidapi-host" = "auto-parts-catalog.p.rapidapi.com"
  "x-rapidapi-key"  = "d6cc296d32mshdf55da512f1a00fp15bd5bjsnd3c6e5439b8d"
}
$response | ConvertTo-Json -Depth 5 > response.json
