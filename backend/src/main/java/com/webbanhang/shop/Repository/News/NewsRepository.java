package com.webbanhang.shop.Repository.News;

import com.webbanhang.shop.Model.News.News;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NewsRepository extends JpaRepository<News, Integer> {

    @Query("SELECT n FROM News n LEFT JOIN FETCH n.newsImages WHERE n.deletedAt IS NULL")
    List<News> findAllByDeletedAtIsNull();

    @Query("SELECT n FROM News n LEFT JOIN FETCH n.newsImages WHERE n.deletedAt IS NOT NULL ORDER BY n.deletedAt DESC")
    List<News> findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();

    @Query("SELECT n FROM News n LEFT JOIN FETCH n.newsImages WHERE n.newsId = :id")
    Optional<News> findByIdWithImages(Integer id);

    @Query("SELECT n FROM News n LEFT JOIN FETCH n.newsImages WHERE n.slug = :slug AND n.deletedAt IS NULL")
    Optional<News> findBySlug(@Param("slug") String slug);

    @Query("SELECT n FROM News n WHERE n.slug = :slug")
    Optional<News> findBySlugIncludeDeleted(@Param("slug") String slug);
}
