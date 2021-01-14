import React from 'react';
import {Platform} from 'react-native';
import {useTracked} from '../../provider';
import {DDS} from '../../services/DeviceDetection';
import {hexToRGBA} from '../../utils/ColorUtils';
import ActionSheet from 'react-native-actions-sheet';
import {GetPremium} from './GetPremium';
import { editing } from '../../utils';
import { post } from '../../views/Editor/Functions';

const ActionSheetWrapper = ({
  children,
  fwdRef,
  gestureEnabled = true,
  onClose,
  onOpen,
  closeOnTouchBackdrop = true,
}) => {
  const [state] = useTracked();
  const {colors} = state;
  const largeTablet = DDS.isLargeTablet();
  const smallTablet = DDS.isTab;

  const style = React.useMemo(() => {
    return {
      width: largeTablet || smallTablet ? 500 : '100%',
      maxHeight: largeTablet ? 500 : '100%',
      borderTopRightRadius: 10,
      borderTopLeftRadius: 10,
      backgroundColor: colors.bg,
      padding: largeTablet ? 8 : 0,
      zIndex: 10,
      paddingVertical: 12,
      borderBottomRightRadius: largeTablet ? 10 : 1,
      borderBottomLeftRadius: largeTablet ? 10 : 1,
      marginBottom: largeTablet ? 50 : 0,
      alignSelf: 'center',
      paddingTop: gestureEnabled ? 8 : 18,
    };
  }, [colors.bg, gestureEnabled]);




  return (
    <ActionSheet
      ref={fwdRef}
      hideUnderlay={largeTablet || smallTablet ? true : false}
      containerStyle={style}
      gestureEnabled={gestureEnabled}
      extraScroll={largeTablet ? 50 : 0}
      initialOffsetFromBottom={1}
      closeOnTouchBackdrop={closeOnTouchBackdrop}
      indicatorColor={
        Platform.OS === 'ios'
          ? hexToRGBA(colors.accent + '19')
          : hexToRGBA(colors.shade)
      }
      onOpen={onOpen}
      keyboardShouldPersistTaps="always"
      premium={
        <GetPremium
          context="sheet"
          close={() => fwdRef?.current?.hide()}
          offset={50}
        />
      }
      onClose={() => {
        console.log(editing.isFocused,editing.focusType)
        if (editing.isFocused === true) {
          post('blur');
          if (editing.focusType == "editor") {
            post('focusEditor');
          } else {
            post('focusTitle');
          }
        }

        if (onClose) {
          onClose()
        }
      } }>
      {children}
    </ActionSheet>
  );
};

export default ActionSheetWrapper;
