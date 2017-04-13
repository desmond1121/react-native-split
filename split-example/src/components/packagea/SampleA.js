import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet
} from 'react-native';
import {
  FuncA, FuncB
} from 'example/src/modules';
import ApiOfSampleA from './ApiOfSampleA';

class SampleA extends React.Component {
  render() {
    ApiOfSampleA();
    FuncA();
    FuncB();
    return (
      <View style={styles.container}>
        <Image
          style={styles.image}
          source={require('example/src/assets/naruto.jpeg')}/>
        <Text>This is SampleA</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column'
  },
  image: {
    width: 355,
    height: 200
  }
});


const AppRegistry = require('AppRegistry');
AppRegistry.registerComponent('SampleA', () => SampleA);

module.exports = SampleA;
