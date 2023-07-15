import $ from "jquery";
import { makeState } from "./state";

const DEFAULT_SPEED = 10;

const SERVERS_NUMBER = 7;
const SERVER_RADIUS = 50;

const MESSAGE_RADIUS = 10;

const svgSide = 0.8 * ((window.innerHeight > window.innerWidth) ? window.innerWidth : window.innerHeight);

const createSVGElement = (tag) => $(document.createElementNS('http://www.w3.org/2000/svg', tag));

var render = {};
var state;

$(function (){

	var onReplayDone = undefined;

	
	const svg = $("svg");

	state = makeState({
		servers: [],
		messages: []
	});


	
	svg.attr('height', svgSide);
	svg.attr('width', svgSide);
	
	const ringAttributes = {
		cx: svgSide / 2,
		cy: svgSide / 2,
		r: (svgSide / 2) - 2 * SERVER_RADIUS
	}
	
	
	const getServerAttributes = (id) => {
		const angle = 2 * Math.PI * (0.75 + (id / SERVERS_NUMBER));
		return {
			cx: ringAttributes.cx + ringAttributes.r * Math.cos(angle),
			cy: ringAttributes.cy + ringAttributes.r * Math.sin(angle),
			r: SERVER_RADIUS
		}
	}

	const getMessageAttributes = (from, to, frac) => {
		const fromAttributes = getServerAttributes(from);
		const toAttributes = getServerAttributes(to);
		
		const totalDistance = Math.sqrt( Math.pow(fromAttributes.cx - toAttributes.cx, 2) + 
																Math.pow(fromAttributes.cy - toAttributes.cy, 2));
		const travelDistance = totalDistance - 2 * SERVER_RADIUS;
		frac = (SERVER_RADIUS / totalDistance) + frac * (travelDistance / totalDistance);
		return {
			cx: fromAttributes.cx + (toAttributes.cx - fromAttributes.cx) * frac,
			cy: fromAttributes.cy + (toAttributes.cy - fromAttributes.cy) * frac,
			r: MESSAGE_RADIUS,
		}
	}
	
	
	for(let i = 0; i < SERVERS_NUMBER; i++)
	{
		$('#servers', svg).append(createSVGElement("circle").attr("id", `server-${i}`).attr(getServerAttributes(i)));
	}

	render.messages = function (messagesSame) {
		var messagesGroup = $('#messages', svg);
		if (!messagesSame) {
			messagesGroup.empty();
			state.current.messages.forEach(function (message, i) {
				var a = SVG('a')
					.attr('id', 'message-' + i)
					.attr('class', 'message ' + message.direction + ' ' + message.type)
					.attr('title', message.type + ' ' + message.direction)//.tooltip({container: 'body'})
					.append(SVG('circle'))
					.append(SVG('path').attr('class', 'message-direction'));
				if (message.direction == 'reply')
					a.append(SVG('path').attr('class', 'message-success'));
				messagesGroup.append(a);
			});
		}
		state.current.messages.forEach(function (message, i) {
			var s = getMessageAttributes(message.from, message.to,
				(state.current.time - message.sendTime) /
				(message.recvTime - message.sendTime));
			$('#message-' + i + ' circle', messagesGroup)
				.attr(s);
			if (message.direction == 'reply') {
				var dlist = [];
				dlist.push('M', s.cx - s.r, comma, s.cy,
					'L', s.cx + s.r, comma, s.cy);
				if ((message.type == 'RequestVote' && message.granted) ||
					(message.type == 'AppendEntries' && message.success)) {
					dlist.push('M', s.cx, comma, s.cy - s.r,
						'L', s.cx, comma, s.cy + s.r);
				}
				$('#message-' + i + ' path.message-success', messagesGroup)
					.attr('d', dlist.join(' '));
			}
			var dir = $('#message-' + i + ' path.message-direction', messagesGroup);
			if (playback.isPaused()) {
				dir.attr('style', 'marker-end:url(#TriangleOutS-' + message.type + ')')
					.attr('d',
						messageArrowSpec(message.from, message.to,
							(state.current.time - message.sendTime) /
							(message.recvTime - message.sendTime)));
			} else {
				dir.attr('style', '').attr('d', 'M 0,0'); // clear
			}
		});
	};

	var lastRenderedO = null;
	var lastRenderedV = null;
	render.update = function () {
		// Same indicates both underlying object identity hasn't changed and its
		// value hasn't changed.
		// var serversSame = false;
		var messagesSame = false;
		if (lastRenderedO == state.current) {
			// serversSame = util.equals(lastRenderedV.servers, state.current.servers);
			messagesSame = util.equals(lastRenderedV.messages, state.current.messages);
		}
		lastRenderedO = state;
		lastRenderedV = state.base();
		// render.clock();
		// render.servers(serversSame);
		render.messages(messagesSame);
		// if (!serversSame)
		// 	render.logs();
	};

	(function () {
		var last = null;
		var step = function (timestamp) {
			if (last !== null && timestamp - last < 500) {
				var wallMicrosElapsed = (timestamp - last) * 1000;
				// var speed = speedSliderTransform($('#speed').slider('getValue'));
				var speed = DEFAULT_SPEED;
				var modelMicrosElapsed = wallMicrosElapsed / speed;
				var modelMicros = state.current.time + modelMicrosElapsed;
				state.seek(modelMicros);
				if (modelMicros >= state.getMaxTime() && onReplayDone !== undefined) {
					var f = onReplayDone;
					onReplayDone = undefined;
					f();
				}
				render.update();
			}

			last = timestamp;
			window.requestAnimationFrame(step);
		};
		window.requestAnimationFrame(step);
	})();

	// state.updater = function (state) {
	// 	raft.update(state.current);
	// 	var time = state.current.time;
	// 	var base = state.base(time);
	// 	state.current.time = base.time;
	// 	var same = util.equals(state.current, base);
	// 	state.current.time = time;
	// 	return !same;
	// };

	state.init();
	render.update();
})	
