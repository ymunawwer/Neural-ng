const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const tableSchema = new Schema({
  email: {
    type: String,
    unique: true,
    index: true,
    required: true
  },
  name: {
    type: String,
    default: ''
  },
  total_api_hit_count: {
    type: Number,
    default: 0
  },
  total_model_count: {
    type: Number,
    default: 0
  },
  premium: {
    type: String,
    default: 'Free'
  },
  model: [{
    model_id: {
      type: String,
      default: ''
    },
    created_at: Date,
    accuracy: {
      type: String,
      default: ''
    },
    hint: {
      type: Schema.Types.Mixed
    },
    data_types: {
      type: Schema.Types.Mixed
    },
    algo_hyper: {
      type: Schema.Types.Mixed,
    },
    algo: {
      type: String,
      default: ''
    },
    prob_type: {
      type: Schema.Types.Mixed,
    },
    model_file_path: {
      type: String,
      default: ''
    },
    pkl_file_path: {
      type: String,
      default: ''
    },
    x_list: {
      type: Schema.Types.Mixed
    },
    y_list: {
      type: Schema.Types.Mixed
    },
    train_split: {
      type: Number,
      default: 0
    },
    test_split: {
      type: Number,
      default: 0
    },
    api_hit_count: {
      type: Number,
      default: 0
    },
    model_count: {
      type: Number,
      default: 0
    },
    filepath: {
      type: String,
      default: ''
    },
    steps: {
      type: Number,
      default: 0
    },
    file_extension: {
      type: String,
      default: ''
    }

  }]
});
module.exports = mongoose.model('NeuralZomeUser', tableSchema);
