interface Window { 
	AudioContext;
	webkitAudioContext;
}

declare class OfflineAudioContext 
{ 
	constructor (a, b, c);
	createBufferSource;
	destination;
	startRendering;
	oncomplete;
} 