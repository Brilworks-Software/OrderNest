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
            const modalWidth = Math.min(maxWidth, 240);
            const modalEstHeight = options.length * 52 + 8 + 12;
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
                    Platform.OS === 'web' ? ({ boxShadow: '0 6px 18px rgba(0,0,0,0.12)' } as any) : {},
                  ]}
                >
                  {options.map((o) => (
                    <TouchableOpacity key={o.key} onPress={() => onSelect(o.key)} style={styles.option}>
                      <Text style={styles.optionText}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={onClose} style={[styles.option, styles.cancel]}>
                    <Text style={styles.optionText}>Cancel</Text>
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
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  optionText: {
    fontSize: 16,
    color: '#111',
    textAlign: 'center',
  },
  cancel: {
    backgroundColor: '#fafafa',
  },
});