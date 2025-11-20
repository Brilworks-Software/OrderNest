import React from 'react';
import {
  Modal,
  TouchableWithoutFeedback,
  View,
  TouchableOpacity,
  Text,
  Platform,
  Dimensions,
  StyleSheet,
} from 'react-native';

type Anchor = { x: number; y: number; width: number; height: number } | null;
type Option = { key: string; label: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  anchor: Anchor;
  options: Option[];
  onSelect: (key: string) => void;
  maxWidth?: number;
};

export default function StatusMenuModal({ visible, onClose, anchor, options, onSelect, maxWidth = 320 }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {(() => {
            const windowWidth = Platform.OS === 'web' ? (window as any).innerWidth : Dimensions.get('window').width;
            const windowHeight = Platform.OS === 'web' ? (window as any).innerHeight : Dimensions.get('window').height;
            const modalWidth = Math.min(maxWidth, 280);
            const modalEstHeight = options.length * 56 + 8 + 64;
            let left = anchor ? anchor.x : (windowWidth - modalWidth) / 2;
            let top = anchor ? anchor.y + anchor.height + 8 : (windowHeight - modalEstHeight) / 2;

            if (anchor) {
              if (top + modalEstHeight > windowHeight) {
                top = Math.max(8, anchor.y - modalEstHeight - 8);
              }
            }

            if (left + modalWidth > windowWidth) left = Math.max(8, windowWidth - modalWidth - 8);
            if (left < 8) left = 8;

            return (
              <TouchableWithoutFeedback>
                <View
                  style={[
                    styles.content,
                    {
                      position: 'absolute',
                      left,
                      top,
                      width: modalWidth,
                    } as any,
                    Platform.OS === 'web' ? ({ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' } as any) : {},
                  ]}
                >
                  {options.map((o, index) => (
                    <TouchableOpacity
                      key={o.key}
                      onPress={() => onSelect(o.key)}
                      style={[
                        styles.option,
                        index === options.length - 1 && styles.optionLast,
                        o.label === "Available" ? styles.availableBG : o.label === "Reserved" ? styles.reservedBG : o.label === "Occupied" ? styles.occupiedBG : {backgroundColor: "#af52de"}
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.optionText}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                  <View style={styles.separator} />
                  <TouchableOpacity
                    onPress={onClose}
                    style={[styles.option, styles.cancel]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            );
          })()}
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    maxHeight: 90,
  },
  availableBG:{
    backgroundColor: "#0a84ff"
  },
  occupiedBG:{
    backgroundColor: "#ff9f0a"
  },
  reservedBG: {
    backgroundColor: "#af52de"
  },
  optionLast: {
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  separator: {
    height: 8,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  cancel: {
    backgroundColor: '#fafafa',
    borderBottomWidth: 0,
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
});