import { NewsService } from '../services/news.service.js';

export const NewsController = {
  getAll: (req, res) => {
    try {
      const news = NewsService.getAll();
      res.json(news);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getOne: (req, res) => {
    try {
      const news = NewsService.getById(req.params.id);
      if (!news) return res.status(404).json({ error: 'News not found' });
      res.json(news);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  create: (req, res) => {
    try {
      const news = NewsService.create(req.body, req.user);
      res.status(201).json(news);
    } catch (error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  update: (req, res) => {
    try {
      const news = NewsService.update(req.params.id, req.body, req.user);
      if (!news) return res.status(404).json({ error: 'News not found' });
      res.json(news);
    } catch (error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  delete: (req, res) => {
    try {
      const success = NewsService.delete(req.params.id, req.user);
      if (!success) return res.status(404).json({ error: 'News not found' });
      res.json({ message: 'News deleted' });
    } catch (error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }
};
