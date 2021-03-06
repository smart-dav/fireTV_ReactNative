import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
	Animated,
	Easing,
	Image,
	StyleSheet,
  	Text,
  	View
} from 'react-native';
import KeyEvent from 'react-native-keyevent';
import ImageButton from './ImageButton';

import config from '../../config';
import keyCodes from '../../keyCodes';


const RATIO                 = config.density;
const STD_DURATION        	= config.stdDuration;
const SHORT_DURATION      	= config.shortDuration;
const WAIT_TO_LARGE_BLOOM_DURATION	= config.waitToLargeBloomDuration;	//-- in miliseconds
const ASSET_URL				= '../../assets/';


/* ------------------------------------------ */
/* ShelfTile specific contants                */
/* ------------------------------------------ */
const CONTENT_X				= config.homeShelves.contentX/RATIO; 
const TILE_KIND_OBJ 		= {
  ORIGINAL: 0,							//-- base row
  EXPANDED: 1,							//-- focused row, unfocused tile
  FOCUSED: 2,							//-- focused row, focused tile
  MED_BLOOMED: 3,						//-- bloomed row, unfocused tile
  LG_BLOOMED: 4							//-- bloomed row, focused tile
};
const TILE_SIZE_ARR 		= [
  [config.homeShelves.baseTileW/RATIO, config.homeShelves.baseTileH/RATIO],					//-- original tile size: 0.303 of the largeBloomed
  [config.homeShelves.focusedBaseTileW/RATIO, config.homeShelves.focusedBaseTileH/RATIO],	//-- expanded tile size: 0.355 (375x211) of the largeBloomed
  [config.homeShelves.focusedTileW/RATIO, config.homeShelves.focusedTileH/RATIO],			//-- focused tile size:  0.559 of the largeBloomed
  [config.homeShelves.bloomedBaseTileW/RATIO, config.homeShelves.bloomedBaseTileH/RATIO],	//-- medBloomed tile size: 0.741 of the largeBloomed
  [config.homeShelves.bloomedTileW/RATIO, config.homeShelves.bloomedTileH/RATIO]			//-- largeBloomed tile size
];
const ORIGINAL_SCALE		= 1
const EXPANDED_SCALE 		= Math.round(TILE_SIZE_ARR[TILE_KIND_OBJ.EXPANDED][0]*100/TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][0])/100;		//1.17
const FOCUSED_SCALE 		= Math.round(TILE_SIZE_ARR[TILE_KIND_OBJ.FOCUSED][0]*100/TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][0])/100;			//1.84
const MED_BLOOMED_SCALE 	= Math.round(TILE_SIZE_ARR[TILE_KIND_OBJ.MED_BLOOMED][0]*100/TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][0])/100;		//2.44
const LG_BLOOMED_SCALE 		= Math.round(TILE_SIZE_ARR[TILE_KIND_OBJ.LG_BLOOMED][0]*100/TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][0])/100;		//3.30
const SCALE_ARR				= [ORIGINAL_SCALE, EXPANDED_SCALE, FOCUSED_SCALE, MED_BLOOMED_SCALE, LG_BLOOMED_SCALE];
//
const infoIconPath 			= require(ASSET_URL + 'images/icons/infoIcon.png');
const playIconPath 			= require(ASSET_URL + 'images/icons/playIcon.png');
const addToIconPath 		= require(ASSET_URL + 'images/icons/addToIcon.png');
const selectedInfoIconPath 	= require(ASSET_URL + 'images/icons/infoIconSelected.png');
const selectedPlayIconPath 	= require(ASSET_URL + 'images/icons/playIconSelected.png');
const selectedAddToIconPath = require(ASSET_URL + 'images/icons/addToIconSelected.png');

const ICON_SIZE				= 60/RATIO;
const ICON_XOFFSET			= 100/RATIO;


export default class ShelfTile extends Component {
	constructor(props) {
		super(props)
		this.state = {
			tileKind: TILE_KIND_OBJ.ORIGINAL,
			imageScale: new Animated.Value(1),
			overlayOpacity: new Animated.Value(0),
			selectedMenuIndex: 1,
		}

		this.menus= []
		this.totalMenus = 3

		this.prevMenu = null
		this.currMenu = null
		this.nextMenu = null

		this.episodeIDWidth = 95/RATIO
		this.bloomToLargeTimerID = null
	}

	doLeft = () => {
		if (this.state.tileKind !== TILE_KIND_OBJ.LG_BLOOMED) return
		// console.log("INFO ShelfTile :: doLeft, tile " + this.props.index)
		//-- for menu handling
		if (this.state.selectedMenuIndex !== 0) {
			this.setState({selectedMenuIndex: this.state.selectedMenuIndex - 1 })
			// console.log("INFO ShelfTile :: doLeft, to the menu in the left, this.state.selectedMenuIndex? " + this.state.selectedMenuIndex)
		} else {
			// console.log("INFO ShelfTile :: doLeft, calling callBackOnNoMenuLeft")
			this.props.callBackOnNoMenuLeft("left")
		}
	}//doLeft

	doRight = () => {
		if (this.state.tileKind !== TILE_KIND_OBJ.LG_BLOOMED) return
		// console.log("INFO ShelfTile :: doRight, tile " + this.props.index)
		//-- for menu handling
		if (this.state.selectedMenuIndex < (this.totalMenus - 1)) {
			this.setState({selectedMenuIndex: this.state.selectedMenuIndex + 1 })
			// console.log("INFO ShelfTile :: doRight, to the menu in the right, after, this.selectedMenuIndex? " + this.state.selectedMenuIndex)
		} else {
			// console.log("INFO ShelfTile :: doRight, calling callBackOnNoMenuLeft")
			this.props.callBackOnNoMenuLeft("right")
		}
	}//doRight

	doSelect = () => {
		// console.log("INFO ShelfTile :: doSelect, tileIndex ? " + this.props.index)
		// console.log("INFO ShelfTile :: doSelect, tileKind ? " + this.state.tileKind)
		switch (this.state.tileKind) {
			case TILE_KIND_OBJ.FOCUSED:
				console.log("INFO ShelfTile :: doSelect, focusedTile !!!!!, tileIndex ? " + this.props.index)
				this._clearBloomTimer()
				this._waitToLargeBloom()	
				this._goToShowDetail()
				break;
			case TILE_KIND_OBJ.LG_BLOOMED:
				console.log("INFO ShelfTile :: doSelect, lgBloomedTile !!!!!, selectedMenuIndex ? " + this.state.selectedMenuIndex)
				const { selectedMenuIndex } = this.state
				this.menus[selectedMenuIndex].doSelect()
				break;
		}
	}//doSelect

	backToOrg = (pDuration=SHORT_DURATION) => {
		// console.log("INFO ShelfTile :: backToOrg, index: " + this.props.index)
		this._clearBloomTimer()
		this._updateKind(TILE_KIND_OBJ.ORIGINAL)
		this._changeScale(SCALE_ARR[TILE_KIND_OBJ.ORIGINAL], pDuration)
		this._hideOverlay()
	}//backToOrg

	toFocused = (pDuration=SHORT_DURATION) => {
		// console.log("INFO ShelfTile :: toFocused, index: " + this.props.index)
		this._clearBloomTimer()
		this._updateKind(TILE_KIND_OBJ.FOCUSED)
		this._changeScale(SCALE_ARR[TILE_KIND_OBJ.FOCUSED], pDuration)
		this._hideOverlay()
		this._waitToLargeBloom()
	}//toFocused

	toExpanded = (pDuration=SHORT_DURATION) => {
		// console.log("INFO ShelfTile :: toExpanded, index: " + this.props.index)
		this._clearBloomTimer()
		this._updateKind(TILE_KIND_OBJ.EXPANDED)
		this._changeScale(SCALE_ARR[TILE_KIND_OBJ.EXPANDED], pDuration)
		this._hideOverlay()
	}//toExpanded

	toLargeBloomed = (pDuration=SHORT_DURATION) => {
		// console.log("INFO ShelfTile :: toLargeBloomed, tileIndex is " + this.props.index)
		this._clearBloomTimer()
		this._updateKind(TILE_KIND_OBJ.LG_BLOOMED)
		this._changeScale(SCALE_ARR[TILE_KIND_OBJ.LG_BLOOMED], pDuration)
		this._hideOverlay()

		const { callBackOnBloomToLargeStart } = this.props;
      	if (callBackOnBloomToLargeStart) callBackOnBloomToLargeStart()
	}//toLargeBloomed

	toMedBloomed = (pDuration=SHORT_DURATION) => {
		// console.log("INFO ShelfTile :: toMedBloomed, tileIndex is " + this.props.index)
		this._clearBloomTimer()
		this._updateKind(TILE_KIND_OBJ.MED_BLOOMED)
		this._changeScale(SCALE_ARR[TILE_KIND_OBJ.MED_BLOOMED], pDuration)
		this._hideOverlay()
	}//toMedBloomed

	_updateKind = (pKind) => {
		if (pKind === this.state.tileKind) return
		// console.log("INFO ShelfTile :: _updateKind, index: " + this.props.index + ", tileKind: " + pKind)
		this._hideOverlay()
		this.setState({ tileKind: pKind, selectedMenuIndex: 1 })
	}//_updateState

	_changeScale = (targetValue, pDuration=(SHORT_DURATION)) => {
	    // console.log("INFO ShelfTile :: _changeScale, to " + targetValue)
	    Animated.timing(this.state.imageScale).stop()
	    Animated.timing(
	      this.state.imageScale, 
	      {
	        toValue: targetValue,
	        duration: pDuration,
	        easing: Easing.out(Easing.quad),
	      }
	    ).start(this._showOverlay)
	}//_changeScale

	_showOverlay = () => {
		if (this.state.tileKind === TILE_KIND_OBJ.FOCUSED || this.state.tileKind === TILE_KIND_OBJ.LG_BLOOMED) {
			Animated.timing(this.state.overlayOpacity).stop()
		    Animated.timing(
		      this.state.overlayOpacity, 
		      {
		        toValue: 1,
		        duration: SHORT_DURATION,	//hack
		        easing: Easing.out(Easing.quad),
		      }
		    ).start()
		}
	}//_showOverlay

	_hideOverlay = () => {
		Animated.timing(this.state.overlayOpacity).stop()
		Animated.timing(
	      this.state.overlayOpacity, 
	      {
	        toValue: 0,
	        duration: 0,
	      }
	    ).start()
	}//_hideOverlay
	
	_clearBloomTimer = () => {
		// console.log("INFO ShelfTile :: _clearBloomTimer")
		if (this.bloomToLargeTimerID) clearTimeout(this.bloomToLargeTimerID) 
	}//_clearBloomTimer

	_waitToLargeBloom = () => {
		// console.log("INFO ShelfTile :: _waitToLargeBloom")
		this.bloomToLargeTimerID = setTimeout(() => this.toLargeBloomed(), WAIT_TO_LARGE_BLOOM_DURATION)
	}//_waitToLargeBloom

	_goToShowDetail = () => {
		console.log("INFO ShelfTile :: _goToShowDetil")
	}

	_goToVideoPlayer = () => {
		console.log("INFO ShelfTile :: _goToVideoPlayer")
	}

	_onInfoButtonClicked = (e) => {
		console.log("INFO ShelfTile :: _onInfoButtonClicked")
		this._goToShowDetail()
	}//_onInfoButtonClicked

	_onPlayButtonClicked = (e) => {
		console.log("INFO ShelfTile :: _onPlayButtonClicked")
		this._goToVideoPlayer()
	}//_onPlayButtonClicked

	_onAddToButtonClicked = (e) => {
		console.log("INFO ShelfTile :: _onAddToButtonClicked")
	}//_onAddToButtonClicked

	_find_dimesions = (layout) => {
	    const {width, height} = layout
	    console.log('INFO ShelfTile :: _find_dimensions (testing), width is ' + width)
	    // console.log('INFO ShelfTile :: _find_dimensions (testing), height is ' + height)
	 }//_find_dimesions

	_renderContent = () => {
		// console.log("INFO ShelfTile :: _renderContent =======================>")
		const { tileKind, overlayOpacity } = this.state
		const leftX0 = TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][0]/2			//-- leftEnd location (bc, image is transformed to TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][0]/2 xLocation)
		const rightX0 = 10/RATIO
		const textTopMargin0 = 4/RATIO
		const offsetY0 = (TILE_SIZE_ARR[TILE_KIND_OBJ.FOCUSED][1] - TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][1])/2
		//-- (imageSizeYIncrease)/2 for expandedImage
		const expandedIDY = TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][1] + (TILE_SIZE_ARR[TILE_KIND_OBJ.EXPANDED][1] - TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][1])/2 + textTopMargin0
		const showTitleWidth = TILE_SIZE_ARR[TILE_KIND_OBJ.EXPANDED][0]-this.episodeIDWidth
		switch (tileKind) {
			case TILE_KIND_OBJ.EXPANDED:
				return (
					<View 	style={{
								position: 'absolute',
								left: leftX0,
								top: expandedIDY,
								width: TILE_SIZE_ARR[TILE_KIND_OBJ.EXPANDED][0],
								flex: 1,
								flexWrap: 'nowrap',
								flexDirection: 'row',
								alignItems: 'flex-start',
								// borderWidth: .5, borderColor: 'white',
							}} >
						<Text 	style={ shelfTileStyles.boldText }>
							{this.props.episodeID}
						</Text>
						<Text 	style={ {
									... StyleSheet.flatten(shelfTileStyles.regularText),
									width: showTitleWidth,
									// borderWidth: .5, borderColor: 'blue',
								} }
								numberOfLines={1} 
								ellipsizeMode={'tail'} >
							{"  " + this.props.showTitle}
						</Text>
					</View>
				)
			case TILE_KIND_OBJ.FOCUSED:
				const width1 = TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][0]*FOCUSED_SCALE
				const height1 = TILE_SIZE_ARR[TILE_KIND_OBJ.FOCUSED][1]
				const focusedTopY = -(TILE_SIZE_ARR[TILE_KIND_OBJ.FOCUSED][1] - TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][1])/2
				return (
						<Animated.View 	style={{
									position: 'absolute',
									left: leftX0,
									top: focusedTopY,
									width: width1,
									height: height1,
									zIndex: 1000,
									opacity: overlayOpacity,
									backgroundColor: 'rgba(0, 0, 0, .3)',
									// borderWidth: .5, borderColor: 'white',
								}} >
							<Text style={ {
										... StyleSheet.flatten(shelfTileStyles.regularText),
										width: TILE_SIZE_ARR[TILE_KIND_OBJ.FOCUSED][0] - (CONTENT_X + rightX0),
										position: 'absolute',
										top: -focusedTopY + expandedIDY - (28/RATIO*2),
										left: CONTENT_X,
										} }>
								{this.props.showTitle}
							</Text>
							<Text style={ {
										... StyleSheet.flatten(shelfTileStyles.boldText),
										position: 'absolute',
										top: -focusedTopY + expandedIDY - 28/RATIO,
										left: CONTENT_X,
										width: TILE_SIZE_ARR[TILE_KIND_OBJ.FOCUSED][0] - (CONTENT_X + rightX0),
										} }>
								{this.props.episodeTitle}
							</Text>
							<Text style={ {
										... StyleSheet.flatten(shelfTileStyles.regularText),
										position: 'absolute',
										top: -focusedTopY + expandedIDY,
										left: CONTENT_X,
										width: TILE_SIZE_ARR[TILE_KIND_OBJ.FOCUSED][0] - (CONTENT_X + rightX0),
										// borderWidth: .5, borderColor: 'blue',
										} }>
								{this.props.episodeID}
							</Text>
						</Animated.View>
				)
			case TILE_KIND_OBJ.LG_BLOOMED:
				const width2 = TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][0]*LG_BLOOMED_SCALE
				const height2 = TILE_SIZE_ARR[TILE_KIND_OBJ.LG_BLOOMED][1]
				const bloomedTopY = -(TILE_SIZE_ARR[TILE_KIND_OBJ.LG_BLOOMED][1] - TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][1])/2
				const bloomedShowTitleY = 20/RATIO
				const bloomedButtonContainerY = 374/RATIO
				const bloomedEpisodeTitleY = 52/RATIO
				const bloomedBodyY = 463/RATIO
				return (
						<Animated.View 	style={{
									position: 'absolute',
									left: leftX0,
									top: bloomedTopY,
									width: width2,
									height: height2,
									zIndex: 1000,
									opacity: overlayOpacity,
									backgroundColor: 'rgba(0, 0, 0, .3)',
									// borderWidth: .5, borderColor: 'white',
								}} >
							<Text style={ {
										... StyleSheet.flatten(shelfTileStyles.superShowTitleSemibold),
										width: TILE_SIZE_ARR[TILE_KIND_OBJ.LG_BLOOMED][0] - (CONTENT_X + rightX0),
										position: 'absolute',
										top: bloomedShowTitleY,
										left: CONTENT_X,
										} }>
								{this.props.showTitle}
							</Text>
							<Text style={ {
										... StyleSheet.flatten(shelfTileStyles.superEpisodeTitleMedium),
										position: 'absolute',
										top: bloomedEpisodeTitleY,
										left: CONTENT_X,
										width: TILE_SIZE_ARR[TILE_KIND_OBJ.LG_BLOOMED][0] - (CONTENT_X + rightX0),
										} }>
								{this.props.episodeTitle}
							</Text>
							<View style={ {
										position: 'absolute',
										top: bloomedButtonContainerY,
										left: CONTENT_X,
										flex: 1,
										flexDirection: 'row',
										} }>
			         			<ImageButton 	ref={node => this.menus.push(node)}
			         							top={0} left={ICON_XOFFSET*0} 
			         							kind='info'
			         							isSelected={(this.state.selectedMenuIndex === 0)? true: false} 
			         							imageURL={infoIconPath}
			         							selectedImageURL={selectedInfoIconPath}
			         							iconWidth={ICON_SIZE}
			         							iconHeight={ICON_SIZE}
			         							onSelect={this._onInfoButtonClicked} 
			         							/>
			         			<ImageButton 	ref={node => this.menus.push(node)} 
			         							top={0} left={ICON_XOFFSET*1} 
			         							kind='play'
			         							isSelected={(this.state.selectedMenuIndex === 1)? true: false} 
			         							imageURL={playIconPath}
			         							selectedImageURL={selectedPlayIconPath}
			         							iconWidth={ICON_SIZE}
			         							iconHeight={ICON_SIZE}
			         							onSelect={this._onPlayButtonClicked} 
			         							/>
			         			<ImageButton 	ref={node => this.menus.push(node)}
			         							top={0} left={ICON_XOFFSET*2} 
			         							kind='addTo'
			         							isSelected={(this.state.selectedMenuIndex === 2)? true: false} 
			         							imageURL={addToIconPath}
			         							selectedImageURL={selectedAddToIconPath}
			         							iconWidth={ICON_SIZE}
			         							iconHeight={ICON_SIZE}
			         							onSelect={this._onAddToButtonClicked} 
			         							/>
							</View>
							<Text style={ {
										... StyleSheet.flatten(shelfTileStyles.bodyTextBold),
										position: 'absolute',
										top: bloomedBodyY,
										left: CONTENT_X,
										width: TILE_SIZE_ARR[TILE_KIND_OBJ.LG_BLOOMED][0] - (CONTENT_X + rightX0),
										} }
								numberOfLines={4} 
								ellipsizeMode={'tail'}>
								{this.props.episodeID}<Text style={shelfTileStyles.bodyTextRegular}>{" " + this.props.episodeDesc}</Text>
							</Text>
						</Animated.View>
				)
		    case TILE_KIND_OBJ.MED_BLOOMED:
		    default:
		}//switch
	}//_renderContent

	render() {
		// console.log("INFO ShelfTile :: render, this.props.index ? " + this.props.index)
		const { imageScale } = this.state
		//-- bring up the selected tile to front
		const pZindex = (this.state.tileKind === TILE_KIND_OBJ.ORIGINAL) ? this.props.index : 100
		return (
			<View 	style={{	
						left: -TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][0]/2,
						width: '100%',
						// borderColor: 'black', borderWidth: .5		/* for testing */
					}} >
				<Animated.Image 	
						source={this.props.imageURL} 
						style={{
							transform: [
								{ scale: imageScale },
								{ translateX: TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][0]/2 },
								{ translateY: 0 }
							],
							width: TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][0], 
							height: TILE_SIZE_ARR[TILE_KIND_OBJ.ORIGINAL][1],
							resizeMode: Image.resizeMode.cover,
							zIndex: pZindex,
						}} />
				{this._renderContent()}
			</View>
		)
	}//render
};


const shelfTileStyles = StyleSheet.create({
	regularText: {
		fontFamily: 'Helvetica',	//Helvetica Regular
		fontWeight: '400',
	    fontSize: 24/RATIO,
	    textAlign: 'left',
	    color: '#fff',
	},

	boldText: {
		fontFamily: 'Helvetica',	//Helvetica Bold
		fontWeight: '700',
	    fontSize: 24/RATIO,
	    textAlign: 'left',
	    color: '#fff',
	},

	superShowTitleSemibold: {
		fontFamily: 'Poppins-SemiBold',
		// fontWeight: '600',
	    fontSize: 24/RATIO,
	    textAlign: 'left',
	    color: '#fff',
	},

	superEpisodeTitleMedium: {
		fontFamily: 'Poppins-Medium',
		// fontWeight: '500',
	    fontSize: 64/RATIO,
	    textAlign: 'left',
	    color: '#fff',
	},

	bodyTextBold: {
		fontFamily: 'Lato-Bold',
		fontWeight: '700',
	    fontSize: 24/RATIO,
	    textAlign: 'left',
	    color: '#fff',
	},

	bodyTextRegular: {
		fontFamily: 'Lato-Regular',
		fontWeight: '400',
	    fontSize: 24/RATIO,
	    textAlign: 'left',
	    color: '#fff',
	},
});

ShelfTile.propTypes = {
	index:  PropTypes.number,
	showTitle: PropTypes.string,
	episodeTitle: PropTypes.string,
	episodeID: PropTypes.string,
	episodeDesc: PropTypes.string,
	imageURL: PropTypes.number,	/*	require('string') = number!!!*/
	callBackOnBloomToLargeStart: PropTypes.func,
	callBackOnNoMenuLeft: PropTypes.func,
};

ShelfTile.defaultProps = {
	callBackOnBloomToLargeStart: () => {console.log("INFO ShelfTile :: please pass a function for callBackOnBloomToLargeStart")},
	callBackOnNoMenuLeft: () => {console.log("INFO ShelfTile :: please pass a function for callBackOnNoMenuLeft")},
};
