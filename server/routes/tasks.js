const router = require('express').Router();
const controller = require('../controllers/taskController');
const protect = require('../middleware/auth');

router.use(protect);
router.get('/stats', controller.stats);
router.route('/').get(controller.list).post(controller.create);
router.route('/:id').put(controller.update).delete(controller.remove);

module.exports = router;
