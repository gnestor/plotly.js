/**
* Copyright 2012-2018, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var Axes = require('../../plots/cartesian/axes');
var Lib = require('../../lib');

var orientations = ['v', 'h'];

function crossTraceCalc(gd, plotinfo) {
    var calcdata = gd.calcdata;
    var xa = plotinfo.xaxis;
    var ya = plotinfo.yaxis;

    for(var i = 0; i < orientations.length; i++) {
        var orientation = orientations[i];
        var posAxis = orientation === 'h' ? ya : xa;
        var boxList = [];

        // make list of boxes / candlesticks
        // For backward compatibility, candlesticks are treated as if they *are* box traces here
        for(var j = 0; j < calcdata.length; j++) {
            var cd = calcdata[j];
            var t = cd[0].t;
            var trace = cd[0].trace;

            if(trace.visible === true &&
                    (trace.type === 'box' || trace.type === 'candlestick') &&
                    !t.empty &&
                    (trace.orientation || 'v') === orientation &&
                    trace.xaxis === xa._id &&
                    trace.yaxis === ya._id
              ) {
                boxList.push(j);
            }
        }

        setPositionOffset('box', gd, boxList, posAxis);
    }
}

function setPositionOffset(traceType, gd, boxList, posAxis) {
    var calcdata = gd.calcdata;
    var fullLayout = gd._fullLayout;

    // N.B. reused in violin
    var numKey = traceType === 'violin' ? '_numViolins' : '_numBoxes';

    var i, j, calcTrace;
    var pointList = [];
    // !!!
    var tracesPerGroup

    // make list of box points
    for(i = 0; i < boxList.length; i++) {
        calcTrace = calcdata[boxList[i]];
        for(j = 0; j < calcTrace.length; j++) {
            pointList.push(calcTrace[j].pos);
        }
    }

    if(!pointList.length) return;

    // box plots - update dPos based on multiple traces
    var boxdv = Lib.distinctVals(pointList);
    var dPos0 = boxdv.minDiff / 2;

    // if there's no duplication of x points,
    // disable 'group' mode by setting counter to 1
    if(pointList.length === boxdv.vals.length) {
        fullLayout[numKey] = 1;
    }

    // check for forced minimum dtick
    Axes.minDtick(posAxis, boxdv.minDiff, boxdv.vals[0], true);

    var num = fullLayout[numKey];
    var group = (fullLayout[traceType + 'mode'] === 'group' && num > 1);
    var gap = fullLayout[traceType + 'gap'];
    var groupgap = fullLayout[traceType + 'groupgap'];
    var padfactor = group ? (1 - gap) * (1 - groupgap) / num : 1;

    for(i = 0; i < boxList.length; i++) {
        calcTrace = calcdata[boxList[i]];

        var trace = calcTrace[0].trace;
        var t = calcTrace[0].t;
        var width = trace.width;
        var side = trace.side;
        var pointpos = trace.pointpos;

        var dPos = t.dPos = (width / 2) || dPos0;
        var vpadplus = 0;
        var vpadminus = 0;

        if(side === 'positive') {
            vpadplus = dPos;
        } else if(side === 'negative') {
            vpadminus = dPos;
        } else {
            vpadplus = dPos;
            vpadminus = dPos;
        }

        // TODO need to figure our

        console.log(trace.boxpoints, trace.points)

        if(trace.boxpoints || trace.points) {
            var jitter = trace.jitter;
            var ref = dPos * (width ? 1 : padfactor);

            if((pointpos + jitter) > 0) {
                var pp = ref * (pointpos + jitter);
                console.log('+', pp, vpadplus)
                if(pp > vpadplus) vpadplus = pp;
            }
            if((pointpos - jitter) < 0) {
                var pm = -ref * (pointpos - jitter);
                console.log('-', pm, vpadminus)
                if(pm > vpadminus) vpadminus = pm;
            }
        }

        // calcdata[i][j] are in ascending order
        var firstPos = calcTrace[0].pos;
        var lastPos = calcTrace[calcTrace.length - 1].pos;

        trace._extremes[posAxis._id] = Axes.findExtremes(posAxis, [firstPos, lastPos], {
            vpadminus: vpadminus,
            vpadplus: vpadplus,
            // padded: padded
        });
    }
}

module.exports = {
    crossTraceCalc: crossTraceCalc,
    setPositionOffset: setPositionOffset
};
