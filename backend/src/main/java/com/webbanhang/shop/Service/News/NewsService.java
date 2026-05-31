package com.webbanhang.shop.Service.News;

import com.webbanhang.shop.DTO.News.NewsUpsertRequest;
import com.webbanhang.shop.Model.News.News;

import java.util.List;
import java.util.Optional;

public interface NewsService {
    List<News> findAllActive();

    List<News> findAllTrashed();

    Optional<News> findById(Integer id);

    News create(News news);

    Optional<News> update(Integer id, News news);

    News createFromDto(NewsUpsertRequest dto);

    Optional<News> updateFromDto(Integer id, NewsUpsertRequest dto);

    boolean softDelete(Integer id);

    boolean restore(Integer id);

    boolean deleteForever(Integer id);
}
