import update from 'immutability-helper';
import { 
	FETCH_SCORE, 
	FETCH_RIBBON_CONTENT,
	FETCH_MANIFESTATIONS, 
	FETCH_CONCEPTUAL_SCORE, 
	PROCESS_ANNOTATION, 
	REGISTER_PUBLISHED_PERFORMANCE_SCORE,
	SEGMENT, 
	FETCH_COMPONENT_TARGET,
	SCORE_PREV_PAGE,
	SCORE_PAGE_TO_TARGET,
	SCORE_NEXT_PAGE,
	RESET_NEXT_SESSION_TRIGGER,
	TRANSITION_TO_NEXT_SESSION
} from '../actions/index'

const EMBODIMENT = 'frbr:embodiment';
const MEITYPE = 'meld:MEIEmbodiment';
const AUDIOTYPE = 'meld:AudioEmbodiment';
const MEMBER = 'rdfs:member';

const vrvTk = new verovio.toolkit();

const scale = 35;

let conceptualScore;

const vrvOptions = {
			/*
		// DW 20170830 pre-merge meld-companion options:
                pageHeight: 1400,
                pageWidth: 2000,
				spacingLinear: 0.05,
				spacingNonLinear: 0.05,
				spacingStaff: 0.05,
				spacingSystem: 0.05,
				ignoreLayout: true,
                adjustPageHeight: true,
                scale: 36 
			*/
		ignoreLayout:true,
		adjustPageHeight:true,
		scale:scale,
		pageHeight: 760*100/scale,
		pageWidth: 1200*100/scale
};

export default function(state = {publishedScores: {}, conceptualScores: {}, MEI: {}, SVG: {}, componentTargets: {}, scoreMapping: {}, pageNum: 1, pageCount: 0, triggerNextSession: ""}, action) { 
	let svg;
	const pageCount = vrvTk.getPageCount();
	switch(action.type) {
	case FETCH_SCORE:
        svg = vrvTk.renderData(action.payload.data, vrvOptions);
		return update(state, {
			SVG: { $merge: { [action.payload.config.url]: svg } },
			MEI: { $merge: { [action.payload.config.url]: action.payload.data } } ,
			pageNum: {$set: 1} ,
			pageCount: { $set: pageCount }
		});

    case FETCH_RIBBON_CONTENT:
		var orch =  new Orchestration(action.payload.data);
		var svgRibbon = orch.drawOrchestration(false, 0, 400, 0, 600);
		return update(state, {MEI: { $merge: {[action.payload.config.url]: svgRibbon.outerHTML}}});

    case FETCH_MANIFESTATIONS:
		console.log("IN FETCH_MANIFESTATIONS, payload is: ", action.payload)
		const target = action.payload.target;
		const part = action.payload.part;
		if(typeof part === "undefined") {
			// part wasn't on segment line
			return state;
		}
		let fragments={};
		// go through each part, finding embodibags
		if(EMBODIMENT in part) { 
			if(!Array.isArray(part[EMBODIMENT])) { 
				part[EMBODIMENT] = [part[EMBODIMENT]];
			}
			part[EMBODIMENT].map( (embodiment) => { 
				// go through each embodiment
				if(MEMBER in embodiment) {
					let fragtype;
					// extract set of fragments
					// we want to separate out different types of media fragments
					if(!Array.isArray(embodiment["@type"])) { 
						embodiment["@type"] = [embodiment["@type"]];
					}
					if(!Array.isArray(target["@type"])) { 
						target["@type"] = [target["@type"]];
					}
					if (embodiment["@type"].includes(MEITYPE)) {
						fragtype="MEI";
					} else if (embodiment["@type"].includes(AUDIOTYPE)) { 
						fragtype="Audio";
					} else { console.log("Score Reducer: Embodiment with unknown type", embodiment); }
					if(!Array.isArray(embodiment[MEMBER])) { 
						embodiment[MEMBER] = [embodiment[MEMBER]];
					}
					fragments[fragtype] = fragments[fragtype] || [];
					fragments[fragtype] = fragments[fragtype].concat(embodiment[MEMBER].map( (member) => {
						return member["@id"];
					}));
					fragments["description"] = target["rdfs:label"];
					if(target["@type"].includes("meld:Muzicode")) {
						fragments["muzicodeType"] = target["mc:type"];
						fragments["cue"] = target["climb:cue"];
					}
				} else { console.log("Embodiment without members: ", part, embodiment); }
			});
			console.log("Updating state: ");
			console.log( update(state, {componentTargets: { $merge: { [target["@id"]]: fragments } } }));
			return update(state, {componentTargets: { $merge: { [target["@id"]]: fragments } } });
		};
		console.log("FETCH_MANIFESTATIONS: Unembodied target! ", target);
		return state;


	case FETCH_CONCEPTUAL_SCORE:
		const cS = action.payload;
		//return update(state, {publishedScores: { $push: [conceptualScore[PUBLISHED_AS]["@id"]] } });
		return update(state, {
			publishedScores: { 
				$set: {
					[cS["mo:published_as"]["@id"]]: cS["@id"]
				 } 
			}
		});

	case FETCH_COMPONENT_TARGET:
		// ensure that our structure target collection is an array, then push this one in
		conceptualScore = action.payload.conceptualScore;
		// make sure we have an entry for this conceptual score, and that its value is an array
		let newState = update(state, {
			conceptualScores: { 
				$merge: { 
					[action.payload.conceptualScore]: state['conceptualScores'][action.payload.conceptualScore] || []
				}
			}
		});
		// if this is a new structure target, push it in
		if(!newState['conceptualScores'][action.payload.conceptualScore].includes(action.payload.structureTarget)) { 
			newState = update(newState, {
				conceptualScores: {
					[action.payload.conceptualScore]: { $push: [action.payload.structureTarget] }
				}
			});
		} 
		return newState;
/*
	case SCORE_PREV_PAGE:
		// if we're on page 1, do nothing
		if(action.payload.pageNum === 1) { 
			return state;
		} else { 
			vrvTk.loadData(action.payload.data);
			svg = vrvTk.renderPage(action.payload.pageNum-1, vrvOptions);
		}
		return update(state, {
			SVG: { $merge: { [action.payload.uri]: svg } },
			pageNum: {$set: action.payload.pageNum-1} 
		});
	*/	
	case SCORE_NEXT_PAGE:
		if(!action.payload.data) { 
			console.log("SCORE_NEXT_PAGE attempted on non-loaded MEI data - ignoring!");
			return state;
		}
		console.log("Page count: ", pageCount);
		console.log("Page num: ", action.payload.pageNum);
		console.log("URI: ", action.payload.uri);
		if(action.payload.pageNum === pageCount) { 
			// we've left the last page, set up a transfer to the next session
			console.log("TRIGGERING")
			return update(state, { triggerNextSession: { $set: true  } });
		} else { 
			vrvTk.loadData(action.payload.data);
			svg = vrvTk.renderPage(action.payload.pageNum+1, vrvOptions);

			return update(state, {
				//SVG: { $merge: { [action.payload.uri]: svg } }, -- DW merge -> set 20170722
				SVG: { $set: { [action.payload.uri]: svg } },
				pageNum: {$set: action.payload.pageNum+1},
				pageCount: {$set:pageCount}
			});
		}
	
	case SCORE_PREV_PAGE:
		console.log("REDUCER GOT PREV");
		if(!action.payload.data) { 
			console.log("SCORE_PREV_PAGE attempted on non-loaded MEI data - ignoring!");
			return state;
		}
		console.log("Page count: ", pageCount);
		console.log("Page num: ", action.payload.pageNum);
		console.log("URI: ", action.payload.uri);
		if(action.payload.pageNum === 0) { 
			// we've left the last page, set up a transfer to the next session
			console.log("SCORE_PREV_PAGE attempted on first page -- ignoring!");
			return state;
		} else { 
			vrvTk.loadData(action.payload.data);
			svg = vrvTk.renderPage(action.payload.pageNum-1, vrvOptions);

			return update(state, {
				//SVG: { $merge: { [action.payload.uri]: svg } }, -- DW merge -> set 20170722
				SVG: { $set: { [action.payload.uri]: svg } },
				pageNum: {$set: action.payload.pageNum-1},
				pageCount: {$set:pageCount}
			});
		}

	case TRANSITION_TO_NEXT_SESSION:
		console.log("forcing transition to next session if queued");
		return update(state, { triggerNextSession: { $set: true  } });

	case SCORE_PAGE_TO_TARGET:
		if(!action.payload.data) {
			console.log("SCORE_PAGE_TO_TARGET attempted on non-loaded MEI data - ignoring!");
			return state;
		}
		const frag=action.payload.target.split("#")[1]
		const pageNum = vrvTk.getPageWithElement(frag)
		vrvTk.loadData(action.payload.data)
		svg = vrvTk.renderPage(pageNum)
		return update(state, {
			SVG: { $set: { [action.payload.uri]: svg } },
			pageNum: {$set: pageNum} 
		});

	case REGISTER_PUBLISHED_PERFORMANCE_SCORE:
		console.log("Register published performance score: ", action.payload, "on state: ", state);
		if(action.payload.conceptualScore["@id"] in state.scoreMapping) { 
			// we already know this conceptual score
			// do we already know about the published score for this performance medium?
			if(action.payload.performanceMedium["@id"] in state.scoreMapping[action.payload.publishedScore["@id"]]) {
				// yes; so nothing to do. FIXME: should we cater for multiple published scores for same performance medium?
				return state; 
			} else { 
				// no; so register the published score for this new performance medium
				return update(state, {
					scoreMapping: {
						[action.payload.publishedScore["@id"]]: {
							$merge: {
								[action.payload.performanceMedium["@id"]]: action.payload.conceptualScore["@id"]
							}
						}
					}
				})
			}
		} else { 
			// first time we see this conceptual score
			// so attach the published score according to performance medium
			return update(state, {
				scoreMapping: { 
					$merge: {
						[action.payload.publishedScore["@id"]]: {
							[action.payload.performanceMedium["@id"]]: action.payload.conceptualScore["@id"]
						}
					}
				}
			})
		}
	
	default: 
		return state;
	};
};
