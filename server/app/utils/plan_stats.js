'use strict';

exports.totalQty = plans => plans.reduce((sum, plan) => sum + Number(plan.planned_qty || 0), 0);

exports.totalWeight = plans => plans.reduce((sum, plan) => sum + Number(plan.planned_weight || 0), 0);
