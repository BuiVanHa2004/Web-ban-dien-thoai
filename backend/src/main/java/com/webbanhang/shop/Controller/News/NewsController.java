package com.webbanhang.shop.Controller.News;

import com.webbanhang.shop.DTO.News.NewsDto;
import com.webbanhang.shop.DTO.News.NewsUpsertRequest;
import com.webbanhang.shop.Model.News.News;
import com.webbanhang.shop.Service.News.NewsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/news")
public class NewsController {

    private final NewsService newsService;

    public NewsController(NewsService newsService) {
        this.newsService = newsService;
    }

    @GetMapping
    public List<NewsDto> getAll() {
        return newsService.findAllActive().stream().map(NewsDto::fromEntity).toList();
    }

    @GetMapping("/trash")
    public List<NewsDto> getTrash() {
        return newsService.findAllTrashed().stream().map(NewsDto::fromEntity).toList();
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<NewsDto> getById(@PathVariable Integer id) {
        return newsService.findById(id)
                .map(NewsDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<NewsDto> create(@RequestBody NewsUpsertRequest req) {
        News created = newsService.createFromDto(req);
        // Reload with images to ensure they're properly fetched
        News reloaded = newsService.findById(created.getNewsId()).orElse(created);
        return ResponseEntity.status(HttpStatus.CREATED).body(NewsDto.fromEntity(reloaded));
    }

    @PutMapping("/{id:\\d+}")
    public ResponseEntity<NewsDto> update(@PathVariable Integer id, @RequestBody NewsUpsertRequest req) {
        return newsService.updateFromDto(id, req)
                .map(NewsDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id:\\d+}/restore")
    public ResponseEntity<Void> restore(@PathVariable Integer id) {
        boolean ok = newsService.restore(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        boolean ok = newsService.softDelete(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}/force")
    public ResponseEntity<Void> deleteForever(@PathVariable Integer id) {
        boolean ok = newsService.deleteForever(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}
