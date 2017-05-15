import update from 'immutability-helper';
import { FETCH_TEI, FETCH_MANIFESTATIONS} from '../actions/index'

const EMBODIMENT = 'http://purl.org/vocab/frbr/core#embodiment';
const ASSOCIATED = "http://example.com/must-revisit-these/associatedWith";
const MEMBER = 'http://www.w3.org/2000/01/rdf-schema#member';
const TEITYPE = 'http://meld.linkedmusic.org/terms/TEIEmbodiment';

export default function(state = {TEI: {}, componentTargets: {}, fragImages:{}}, action) {
	switch(action.type) { 
	case FETCH_TEI:
		return update(state, { TEI: {$merge: { [action.payload.uri]: action.payload.data } } });

	case FETCH_MANIFESTATIONS:
		// find associated TEI
		const target = action.payload.target["@graph"][0];
		const part = action.payload.part["@graph"][0];
		if(typeof part === "undefined") {
			// part wasn't on segment line
			return state;
		}
		console.log("In FETCH_MANIFESTATIONS TEI, target is: ", target, " part is: ", part);
		let fragments = [];
		// go through each part, finding embodibags
		if(EMBODIMENT in part) { 
			if(!Array.isArray(part[EMBODIMENT])) { 
				part[EMBODIMENT] = [part[EMBODIMENT]];
			}
			part[EMBODIMENT].map( (embodiment) => { 
				// go through each embodiment
				if(MEMBER in embodiment) {
					// extract set of fragments
					if(!Array.isArray(embodiment["@type"])) { 
						embodiment["@type"] = [embodiment["@type"]];
					}
					if (embodiment["@type"].includes(TEITYPE)) {
						if(!Array.isArray(embodiment[MEMBER])) { 
							embodiment[MEMBER] = [embodiment[MEMBER]];
						}
						fragments = fragments.concat(embodiment[MEMBER].map( (member) => {
							return member["@id"];
						}));

					} else { console.log("Embodiment with unknown type", embodiment); }
					//fragments[fragtype] = embodiment[MEMBER].map( (member) => {
				} else { console.log("Embodiment without members: ", part, embodiment); }
			});
			console.log("Updating TEI state: ");
			console.log( update(state, {componentTargets: { $merge: { [target["@id"]]: fragments } } }));
			return update(state, {componentTargets: { $merge: { [target["@id"]]: fragments } } });
		};
		/*
        if(ASSOCIATED in target) { 
			if(!Array.isArray(target[ASSOCIATED])) { 
				target[ASSOCIATED] = [target[ASSOCIATED]];
			}
            // extract target fragments
            // TODO properly ontologize ASSOCIATED, including differentiating TEI and others
            const fragments = target[ASSOCIATED].map( (assoc) => { 
                return assoc["@id"];
            });
            const targetid = target["@id"];
			// are there any associated images?
			const fragImages = {};
		    target[ASSOCIATED].filter( (assoc) => {
				return EMBODIMENT in assoc
			}).map( (assoc) => { 
				fragImages[assoc["@id"]] = assoc[EMBODIMENT]["@id"];
			})
            return update(state, {
				componentTargets: { $merge: { [target["@id"]]: fragments }},
				fragImages: { $merge: fragImages }
		 	});
        console.log("FETCH_COMPONENT_TARGET: Unassociated target! ", target);
        }*/
        return state;
	default:
		return state;
	};
};
