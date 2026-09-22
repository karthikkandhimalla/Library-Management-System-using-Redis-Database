const express = require('express');
const router = express.Router();
const { getRecommendations } = require('../services/neo4jService');

router.get('/:studentId', async (req, res) => {
  try {
    const recommendations = await getRecommendations(req.params.studentId);
    res.json({
      studentId: req.params.studentId,
      message: 'Graph-based recommendation feature using Neo4j relationships.',
      recommendations,
    });
  } catch (error) {
    res.status(503).json({ message: error.message || 'Unable to fetch recommendations.' });
  }
});

module.exports = router;
