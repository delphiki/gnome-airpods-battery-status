/**
 * Created by Julien "delphiki" Villetorte (delphiki@protonmail.com)
 */
const Main = imports.ui.main;
const { Clutter, GLib, St, Gio } = imports.gi;
const ByteArray = imports.byteArray;
const Mainloop = imports.mainloop;
const Me = imports.misc.extensionUtils.getCurrentExtension();

let box = new St.BoxLayout();
let aggregateMenu;
let powerIndicator;
let apodsmonFilePath = '/tmp/apodsmon.out';
let currentStatusValue;
let leftAirpodLabel;
let rightAirpodLabel;
let icon;
let caseLabel;
let caseIcon;

function getCurrentStatus() {
	let fileContents = GLib.file_get_contents(apodsmonFilePath)[1];

	let lines;
	if (fileContents instanceof Uint8Array) {
		lines = ByteArray.toString(fileContents).trim().split('\n');
	} else {
		lines = fileContents.toString().trim().split('\n');
	}

	let lastLine = lines[lines.length - 1].split(' ');

	return {
		'L': lastLine[1],
		'R': lastLine[3],
		'C': lastLine[5]
	};
}

function updateBatteryStatus() {
	currentStatusValue = getCurrentStatus();

	if (currentStatusValue.L !== 'NA') {
		leftAirpodLabel.set_text(currentStatusValue.L+' %');
	} else {
		leftAirpodLabel.set_text('- %');
	}
	if (currentStatusValue.R !== 'NA') {
		rightAirpodLabel.set_text(currentStatusValue.R+' %');
	} else {
		rightAirpodLabel.set_text('- %');
	}

	if (currentStatusValue.C !== 'NA') {
		caseLabel.set_text(currentStatusValue.C+' %');
		caseLabel.show()
		caseIcon.show();
	} else {
		caseLabel.hide()
		caseIcon.hide();
	}

	return true;
}

function init() {
	aggregateMenu = Main.panel.statusArea["aggregateMenu"];
	powerIndicator = aggregateMenu._power;

	currentStatusValue = getCurrentStatus();

	leftAirpodLabel = new St.Label({
		text: '- %',
		y_align: Clutter.ActorAlign.CENTER,
		style_class: "left-airpod-label"
	});

	icon = new St.Icon({
		gicon: Gio.icon_new_for_string(Me.path + '/airpods.svg'),
		style_class: "system-status-icon",
	});

	rightAirpodLabel = new St.Label({
		text: '- %',
		y_align: Clutter.ActorAlign.CENTER,
		style_class: "right-airpod-label"
	});

	caseIcon = new St.Icon({
		gicon: Gio.icon_new_for_string(Me.path + '/case.svg'),
		style_class: "system-status-icon",
	});

	caseLabel = new St.Label({
		text: '- %',
		y_align: Clutter.ActorAlign.CENTER,
		style_class: "right-airpod-label"
	});

	box.add(leftAirpodLabel)
	box.add(icon);
	box.add(rightAirpodLabel);
	box.add(caseIcon);
	box.add(caseLabel);

	Mainloop.timeout_add(5000, updateBatteryStatus);

}

function enable() {
	powerIndicator.insert_child_at_index(box, 0);
}

function disable() {
	powerIndicator.remove_child(box);
}


let Log = function(msg) {
	log("[Airpods Battery Status] " + msg);
}
