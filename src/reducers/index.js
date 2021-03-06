import { combineReducers } from 'redux';
import GraphReducer from './reducer_graph';
import ScoreReducer from './reducer_score';
import TEIReducer from './reducer_tei';
import AppReducer from './reducer_app';
import SessionControlReducer from './reducer_sessionControl'

const rootReducer = combineReducers({
	graph: GraphReducer,
	score: ScoreReducer,
	tei: TEIReducer,
	app: AppReducer,
	sessionControl: SessionControlReducer
});

export default rootReducer;
