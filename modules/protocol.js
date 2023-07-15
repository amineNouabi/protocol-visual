"use-strict";

import util from './util';


protocol = {}


protocol.sendMessage = (model, message) => {
	message.sendTime = model.time;

	// random ftom 1s to 6s;
	message.receiveTime = message.sendTime + Math.floor(Math.random() * 5000 + 1000);

	model.messages.push(message);
}

protocol.update = (model) => {
	const deliver = [];
	const keep = [];
	model.messages.foreach(message => {
		if(message.receiveTime <= model.time)
			deliver.push(message);
		else if (message.receiveTime < util.Inf)
			keep.push(message);
	})
}