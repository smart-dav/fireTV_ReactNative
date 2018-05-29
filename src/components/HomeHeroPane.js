import React, { Component } from 'react';
import {
  Text,
  // TouchableWithoutFeedback,
  TouchableNativeFeedback,
  View
} from 'react-native';
import styles from '../styles/styles';


export default class HomeHeroPane extends Component {
  constructor(props){
    super(props);
    this.today = new Date();
    this.preStr = (this.today.getMonth() < 9)? "0" : "";
  }

  render() {
    return (
      <TouchableNativeFeedback>
        <View>
            <Text style={styles.comment}>
              {this.constructor.name}
              {"\n\n" + this.today}
            </Text>
        </View>
      </TouchableNativeFeedback>
    );
  }
}
